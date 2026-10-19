import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { imageUrl } from "../api/axios";

export const colors = {
  primary: "#4f46e5",
  bg: "#f5f5f7",
  card: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  danger: "#dc2626",
};

// Khoảng đệm dưới cùng cho màn hình không có thanh tab (tránh thanh home của iPhone và nút điều hướng Android)
export function useBottomPad(extra = 24) {
  return useSafeAreaInsets().bottom + extra;
}

// Trạng thái bàn phím đang mở hay không
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

// Bao màn hình có ô nhập: đẩy nội dung lên khi bàn phím mở, không bị che.
// Độ lệch (header, thanh trạng thái) được đo thật nên đúng trên cả iPhone và Android.
// Nếu trên Android thấy ô nhập bị đẩy lên quá cao, đổi ANDROID_BEHAVIOR thành undefined.
const ANDROID_BEHAVIOR: "padding" | "height" | undefined = "padding";
export function KeyboardScreen({ children }: { children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ flex: 1, backgroundColor: colors.bg }}
      onLayout={() => ref.current?.measureInWindow((_x, y) => setOffset(y))}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : ANDROID_BEHAVIOR}
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

export function Loading({ text = "Đang tải... (lần đầu có thể mất khoảng 1 phút)" }: { text?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.muted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

export function LoginPrompt({ text }: { text: string }) {
  const router = useRouter();
  return (
    <View style={[s.center, { backgroundColor: colors.bg }]}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Bạn chưa đăng nhập</Text>
      <Text style={{ color: colors.muted, textAlign: "center" }}>{text}</Text>
      <Pressable style={s.button} onPress={() => router.push("/login")}>
        <Text style={s.buttonText}>Đăng nhập</Text>
      </Pressable>
    </View>
  );
}

// Dòng "nhãn: giá trị" trong phần thông tin chi tiết; không hiện nếu không có giá trị
export function Row({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  );
}

export function Chip({ text }: { text: string }) {
  return (
    <View style={s.chip}>
      <Text style={{ color: colors.text, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function Avatar({ uri, name, size = 44 }: { uri?: string | null; name?: string; size?: number }) {
  const base = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri: imageUrl(uri) as string }} style={[base, { backgroundColor: "#e5e7eb" }]} />;
  return (
    <View style={[base, { backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: size * 0.42 }}>
        {(name || "?").trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Thanh chọn mục ngang (Gợi ý, Nhận được...), có chấm đỏ khi có thông báo mới
export function Segments({
  options, value, onChange,
}: {
  options: { key: string; label: string; dot?: boolean }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.segment, active && s.segmentActive]}>
              <Text style={{ color: active ? colors.primary : colors.muted, fontWeight: active ? "700" : "500" }}>
                {o.label}
              </Text>
              {o.dot && <View style={s.dot} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// "14:05" nếu là hôm nay, ngược lại "03/11"
export function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === now.toDateString() ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

// Ảnh vuốt ngang, có số thứ tự ở góc
export function Gallery({ images, emoji = "🏠", height = 240 }: { images?: string[]; emoji?: string; height?: number }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (!images?.length) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center", backgroundColor: "#e5e7eb" }}>
        <Text style={{ fontSize: 56 }}>{emoji}</Text>
      </View>
    );
  }
  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => `${u}-${i}`}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image source={{ uri: imageUrl(item) as string }} style={{ width, height }} resizeMode="cover" />
        )}
      />
      {images.length > 1 && (
        <Text style={s.counter}>
          {index + 1}/{images.length}
        </Text>
      )}
    </View>
  );
}

export const shared = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  search: { margin: 12, marginBottom: 0, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, paddingHorizontal: 24 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
});

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 28, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, flexShrink: 0 },
  rowValue: { fontWeight: "600", color: colors.text, flex: 1, textAlign: "right" },
  chip: { backgroundColor: "#eef2ff", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  counter: { position: "absolute", right: 12, bottom: 12, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  segment: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  segmentActive: { borderBottomColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
});
