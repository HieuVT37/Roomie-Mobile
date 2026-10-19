import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMessagesApi, sendMessageApi } from "../../api/conversations";
import { useAuth } from "../../auth/AuthContext";
import {
  KeyboardScreen,
  Loading,
  useKeyboardVisible,
} from "../../components/ui";
import { useNotifications } from "../../context/NotificationContext";

const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
  danger: "#ef4444",
};

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  const [messages, setMessages] = useState<any[]>([]);
  const [canSend, setCanSend] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("token").then(setToken);
  }, []);

  const merge = useCallback((incoming: any[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m._id));
      const add = incoming.filter((m) => !seen.has(m._id));
      return add.length ? [...prev, ...add] : prev;
    });
    lastRef.current = incoming[incoming.length - 1].createdAt;
  }, []);

  const fetchMessages = useCallback(
    async (initial: boolean) => {
      try {
        const data = await getMessagesApi(
          id,
          initial ? undefined : lastRef.current || undefined,
        );
        setCanSend(data.canSend);
        merge(data.messages);
        if (initial || data.messages.length) refreshNotifications();
        setError("");
      } catch (err: any) {
        if (initial)
          setError(err.response?.data?.message || "Không tải được tin nhắn");
      }
    },
    [id, merge, refreshNotifications],
  );

  useFocusEffect(
    useCallback(() => {
      fetchMessages(lastRef.current === null).finally(() => setLoading(false));
      const timer = setInterval(() => fetchMessages(false), 4000);
      return () => clearInterval(timer);
    }, [fetchMessages]),
  );

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });
    if (res.canceled) return;
    setPicked((prev) => [...prev, ...res.assets].slice(0, 4));
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !picked.length) || sending) return;
    setSending(true);
    setError("");
    try {
      const files = picked.map((a, i) => ({
        uri: a.uri,
        name: a.fileName || `photo-${Date.now()}-${i}.jpg`,
        type: a.mimeType || "image/jpeg",
      }));
      const { message } = await sendMessageApi(id, body, files);
      merge([message]);
      setText("");
      setPicked([]);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không gửi được tin nhắn";
      setError(msg);
      if (picked.length) Alert.alert("Không gửi được ảnh", msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading text="Đang tải tin nhắn..." />;

  const data = [...messages].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <KeyboardScreen>
        <Stack.Screen
          options={{
            title: name || "Tin nhắn",
            headerStyle: { backgroundColor: themeColors.card },
            headerTintColor: themeColors.text,
            headerShadowVisible: false,
          }}
        />
        <FlatList
          style={{ flex: 1, backgroundColor: themeColors.bg }}
          data={data}
          inverted
          keyExtractor={(m) => m._id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 12, gap: 6 }}
          ListEmptyComponent={
            <Text style={[s.empty, { transform: [{ scaleY: -1 }] }]}>
              {error || "Hãy gửi tin nhắn đầu tiên."}
            </Text>
          }
          renderItem={({ item: m }) => {
            const mine = m.senderId === user.id;
            return (
              <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                {m.images?.map((u: string) => {
                  // Đảm bảo lấy đúng domain của backend (ví dụ: http://localhost:5000 hoặc IP của bạn)
                  const fullUri = u.startsWith("http")
                    ? u
                    : `http://1.1.1.1:5000${u}`; // (Thay http://10.0.2.2:5000 bằng URL backend thực tế của bạn)

                  return (
                    <Image
                      key={u}
                      source={{
                        uri: fullUri,
                        headers: token
                          ? { Authorization: `Bearer ${token}` }
                          : undefined,
                      }}
                      style={s.photo}
                      resizeMode="cover"
                      onError={(e) =>
                        console.log("Lỗi load ảnh:", e.nativeEvent.error)
                      }
                    />
                  );
                })}
                {m.text ? (
                  <Text
                    style={{
                      color: mine ? "#fff" : themeColors.text,
                      fontSize: 16,
                    }}
                  >
                    {m.text}
                  </Text>
                ) : null}
                <Text
                  style={[
                    s.time,
                    { color: mine ? "#c7d2fe" : themeColors.muted },
                  ]}
                >
                  {hhmm(m.createdAt)}
                </Text>
              </View>
            );
          }}
        />

        {error && messages.length > 0 ? (
          <Text style={s.error}>{error}</Text>
        ) : null}

        {canSend ? (
          <View
            style={[
              s.bar,
              {
                paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8),
              },
            ]}
          >
            {picked.length > 0 && (
              <View style={s.previews}>
                {picked.map((a, i) => (
                  <View key={a.uri}>
                    <Image source={{ uri: a.uri }} style={s.thumb} />
                    <Pressable
                      style={s.remove}
                      onPress={() =>
                        setPicked((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={s.inputRow}>
              <Pressable
                style={s.iconButton}
                onPress={pickImages}
                disabled={picked.length >= 4}
              >
                <Text style={{ fontSize: 20 }}>🖼️</Text>
              </Pressable>
              <TextInput
                style={s.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#64748b"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={2000}
              />
              <Pressable
                style={[
                  s.send,
                  (sending || (!text.trim() && !picked.length)) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={send}
                disabled={sending || (!text.trim() && !picked.length)}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {sending ? "..." : "Gửi"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={[
              s.bar,
              { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 },
            ]}
          >
            <Text style={{ color: themeColors.muted, textAlign: "center" }}>
              Hai bạn chưa kết nối hoặc kết nối đã bị hủy nên không thể nhắn
              tin.
            </Text>
          </View>
        )}
      </KeyboardScreen>
    </View>
  );
}

const s = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  mine: { alignSelf: "flex-end", backgroundColor: themeColors.primary },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: "#334155",
  },
  time: { fontSize: 10, alignSelf: "flex-end" },
  empty: { textAlign: "center", color: themeColors.muted, marginTop: 40 },
  error: {
    color: themeColors.danger,
    textAlign: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bar: {
    backgroundColor: themeColors.card,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
  },
  previews: { flexDirection: "row", gap: 8 },
  thumb: { width: 60, height: 60, borderRadius: 8 },
  remove: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: themeColors.text,
  },
  send: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: themeColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
