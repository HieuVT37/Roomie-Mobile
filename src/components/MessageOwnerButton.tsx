import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { startConversationApi } from "../api/conversations";
import { colors } from "./ui";

// Nút "Nhắn tin" ở tin đăng: mở (hoặc tạo) cuộc trò chuyện với người đăng
export function MessageOwnerButton({ userId, name }: { userId: string; name?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    try {
      const { conversationId } = await startConversationApi(userId);
      router.push({ pathname: "/chat/[id]", params: { id: conversationId, name: name || "Tin nhắn" } });
    } catch (err: any) {
      Alert.alert("Không mở được cuộc trò chuyện", err.response?.data?.message || "Vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable style={[s.button, busy && { opacity: 0.6 }]} onPress={open} disabled={busy}>
      <Text style={s.text}>{busy ? "Đang mở..." : "💬 Nhắn tin"}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: { borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  text: { color: colors.primary, fontWeight: "600" },
});
