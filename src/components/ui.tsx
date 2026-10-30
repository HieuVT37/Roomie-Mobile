import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { imageUrl } from "../api/axios";
import { ListingImage } from "./listing-image";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen) đồng bộ toàn app
export const colors = {
  primary: "#6366f1",
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  danger: "#ef4444",
};

export function useBottomPad(extra = 24) {
  return useSafeAreaInsets().bottom + extra;
}

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

const ANDROID_BEHAVIOR: "padding" | "height" | undefined = "padding";
export function KeyboardScreen({ children }: { children: React.ReactNode }) {
  const ref = useRef<ViewInstance>(null);
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

export function Loading({
  text = "Đang tải... (lần đầu có thể mất khoảng 1 phút)",
}: {
  text?: string;
}) {
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
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
        Bạn chưa đăng nhập
      </Text>
      <Text style={{ color: colors.muted, textAlign: "center" }}>{text}</Text>
      <Pressable style={s.button} onPress={() => router.push("/login")}>
        <Text style={s.buttonText}>Đăng nhập</Text>
      </Pressable>
    </View>
  );
}

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

export function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri?: string | null;
  name?: string;
  size?: number;
}) {
  const base = { width: size, height: size, borderRadius: size / 2 };
  if (uri)
    return (
      <Image
        source={{ uri: imageUrl(uri) as string }}
        style={[base, { backgroundColor: colors.border }]}
      />
    );
  return (
    <View
      style={[
        base,
        {
          backgroundColor: "#312e81",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text
        style={{
          color: "#818cf8",
          fontWeight: "700",
          fontSize: size * 0.42,
        }}
      >
        {(name || "?").trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return d.toDateString() === now.toDateString()
    ? `${p(d.getHours())}:${p(d.getMinutes())}`
    : `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

/** Bounded pages keep every photo visible without stretching or changing screen height. */
export function Gallery({
  images,
  emoji = "🏠",
  height = 240,
}: {
  images?: string[];
  emoji?: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const frameHeight = Number.isFinite(height) ? Math.max(180, Math.min(height, 320)) : 240;
  const validImages = Array.isArray(images)
    ? images.filter((uri): uri is string => typeof uri === "string" && Boolean(uri.trim()))
    : [];

  return (
    <View
      style={{ width: "100%", height: frameHeight }}
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth > 0) setWidth(nextWidth);
      }}
    >
      {width > 0 && validImages.length ? (
        <GalleryPages
          key={`${width}:${frameHeight}:${JSON.stringify(validImages)}`}
          images={validImages}
          width={width}
          height={frameHeight}
          emoji={emoji}
        />
      ) : (
        <ListingImage uri={validImages[0]} emoji={emoji} style={{ height: frameHeight }} />
      )}
    </View>
  );
}

// Remount when the image set or page dimensions change, resetting offset and counter together.
function GalleryPages({ images, width, height, emoji }: { images: string[]; width: number; height: number; emoji: string }) {
  const [index, setIndex] = useState(0);
  return (
    <>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => `${u}-${i}`}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        scrollEventThrottle={16}
        onScroll={(event) =>
          setIndex(Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))
        }
        renderItem={({ item }) => (
          <ListingImage uri={item} emoji={emoji} style={{ width, height }} />
        )}
      />
      {images.length > 1 && (
        <Text style={s.counter}>
          {index + 1}/{images.length}
        </Text>
      )}
    </>
  );
}

// Thanh chọn mục ngang dạng khung chữ nhật bo góc viền tím sáng (Duy nhất 1 Segments)
export function Segments({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string; dot?: boolean }[];
}) {
  return (
    <View style={sSegments.container}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[sSegments.tab, active && sSegments.activeTab]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[sSegments.text, active && sSegments.activeText]}>
              {opt.label}
            </Text>
            {opt.dot && <View style={sSegments.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export const shared = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 40,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
});

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    backgroundColor: colors.bg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.muted, flexShrink: 0, fontSize: 14 },
  rowValue: {
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    textAlign: "right",
    fontSize: 14,
  },
  chip: {
    backgroundColor: "#312e81",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
});

const sSegments = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    margin: 12,
    padding: 4,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  activeText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
});
