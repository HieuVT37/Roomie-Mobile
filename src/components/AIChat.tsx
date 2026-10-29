import { useRef, useState, useSyncExternalStore } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { aiChatApi } from "../api/ai";

const c = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
  danger: "#ef4444",
};

type Msg = { id: string; role: "user" | "assistant"; text: string };

const WELCOME: Msg = {
  id: "welcome",
  role: "assistant",
  text: "Xin chào! Mình là trợ lý Roomie 👋 Bạn cần hỏi về tìm phòng, pass đồ hay ghép bạn cùng phòng?",
};

const SUGGESTIONS = [
  "Phần trăm phù hợp trong Kết nối là gì?",
  "Làm sao để tìm phòng phù hợp?",
  "Pass đồ an toàn cần lưu ý gì?",
];

// Store dùng chung: mọi AIChatButton (ở mọi tab) đọc cùng một danh sách tin nhắn
let sharedMessages: Msg[] = [WELCOME];
const listeners = new Set<() => void>();

const chatStore = {
  get: () => sharedMessages,
  set(updater: Msg[] | ((prev: Msg[]) => Msg[])) {
    sharedMessages =
      typeof updater === "function" ? updater(sharedMessages) : updater;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

function useSharedMessages() {
  const messages = useSyncExternalStore(
    chatStore.subscribe,
    chatStore.get,
    chatStore.get,
  );
  return [messages, chatStore.set] as const;
}

export function AIChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useSharedMessages();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const insets = useSafeAreaInsets();

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: String(Date.now()), role: "user", text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history = next
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));
      const { reply } = await aiChatApi(history);
      setMessages((p) => [
        ...p,
        { id: String(Date.now() + 1), role: "assistant", text: reply },
      ]);
    } catch (err: any) {
      const msg =
        err.code === "ECONNABORTED"
          ? "Máy chủ đang khởi động, bạn thử lại sau ít phút nhé."
          : err.response?.data?.message || "Không kết nối được trợ lý AI.";
      setMessages((p) => [
        ...p,
        { id: String(Date.now() + 1), role: "assistant", text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={s.fab}>
        <Text style={s.fabText}>✨ AI</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          style={[s.root, { paddingTop: insets.top }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.header}>
            <Text style={s.headerTitle}>Trợ lý Roomie ✨</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={s.close}>Đóng</Text>
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => (
              <View style={[s.bubble, item.role === "user" ? s.me : s.bot]}>
                <Text style={s.msgText}>{item.text}</Text>
              </View>
            )}
            ListFooterComponent={
              <>
                {loading && (
                  <View style={[s.bubble, s.bot, { alignSelf: "flex-start" }]}>
                    <ActivityIndicator color={c.primary} />
                  </View>
                )}
                {messages.length === 1 && (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {SUGGESTIONS.map((q) => (
                      <Pressable key={q} style={s.chip} onPress={() => send(q)}>
                        <Text style={s.chipText}>{q}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            }
          />

          <View
            style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}
          >
            <TextInput
              style={s.input}
              placeholder="Câu hỏi của bạn..."
              placeholderTextColor="#64748b"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
            <Pressable
              style={[s.send, (!input.trim() || loading) && { opacity: 0.5 }]}
              onPress={() => send()}
              disabled={!input.trim() || loading}
            >
              <Text style={s.sendText}>Gửi</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: {
    marginRight: 14,
    backgroundColor: c.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { color: c.text, fontSize: 18, fontWeight: "700" },
  close: { color: c.primary, fontSize: 16, fontWeight: "600" },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14 },
  me: { alignSelf: "flex-end", backgroundColor: c.primary },
  bot: {
    alignSelf: "flex-start",
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  msgText: { color: c.text, fontSize: 15, lineHeight: 21 },
  chip: {
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 12,
    padding: 10,
  },
  chipText: { color: c.primary, fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.text,
    fontSize: 15,
  },
  send: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendText: { color: "#fff", fontWeight: "700" },
});
