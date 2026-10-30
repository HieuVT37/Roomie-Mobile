import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { imageUrl } from "../api/axios";

export const CARD_IMAGE_HEIGHT = 210;

/** A fixed frame keeps list rows steady while images load, including portrait photos. */
export function ListingImage({
  uri,
  emoji = "🏠",
  style,
}: {
  uri?: string | null;
  emoji?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const sourceUri = typeof uri === "string" && uri.trim() ? imageUrl(uri.trim()) : null;
  return (
    <View style={[s.frame, style]}>
      {sourceUri ? (
        <ImageContent key={sourceUri} uri={sourceUri} />
      ) : (
        <View style={s.feedback}>
          <Text style={s.emoji}>{emoji}</Text>
          <Text style={s.caption}>Chưa có hình ảnh</Text>
        </View>
      )}
    </View>
  );
}

function ImageContent({ uri }: { uri: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <>
      <Image
        key={attempt}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        accessibilityLabel="Ảnh bài đăng"
        onLoad={() => mounted.current && generation.current === attempt && setStatus("loaded")}
        onError={() => mounted.current && generation.current === attempt && setStatus("error")}
      />
      {status === "loading" && (
        <View style={s.feedback} pointerEvents="none">
          <ActivityIndicator color="#818cf8" />
          <Text style={s.caption}>Đang tải ảnh...</Text>
        </View>
      )}
      {status === "error" && (
        <View style={s.feedback}>
          <Text style={s.caption}>Không tải được ảnh</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thử tải lại ảnh"
            style={s.retry}
            onPress={(event) => {
              event.stopPropagation();
              generation.current += 1;
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            <Text style={s.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  frame: { width: "100%", height: CARD_IMAGE_HEIGHT, backgroundColor: "#172136", overflow: "hidden" },
  feedback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#172136" },
  emoji: { fontSize: 40 },
  caption: { color: "#94a3b8", fontSize: 13, textAlign: "center" },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: "#818cf8", borderRadius: 8 },
  retryText: { color: "#c7d2fe", fontWeight: "600" },
});
