import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { listConversationsApi } from "../../api/conversations";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Loading, LoginPrompt, formatTime } from "../../components/ui";

export default function MessagesScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listConversationsApi();
      setItems(data.items);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tải được danh sách");
    }
  }, [user]);

  // Mở tab thì tải ngay, rồi cập nhật mỗi 10 giây khi đang xem
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
      const timer = setInterval(load, 10000);
      return () => clearInterval(timer);
    }, [load]),
  );

  if (authLoading) return <Loading text="Đang kiểm tra đăng nhập..." />;
  if (!user)
    return (
      <LoginPrompt text="Đăng nhập để nhắn tin với bạn cùng phòng và người đăng tin." />
    );
  if (loading) return <Loading text="Đang tải..." />;

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#6366f1"
            colors={["#6366f1"]}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>Chưa có cuộc trò chuyện</Text>
            <Text style={s.emptySub}>
              {error ||
                "Chưa có cuộc trò chuyện nào. Hãy kết nối với ai đó hoặc bấm “Nhắn tin” ở một tin đăng."}
            </Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <Pressable
            style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: { id: c.id, name: c.other.displayName },
              })
            }
          >
            <Avatar
              uri={c.other.avatarUrl}
              name={c.other.displayName}
              size={54}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  s.name,
                  c.unread > 0 && { fontWeight: "800", color: "#f8fafc" },
                ]}
                numberOfLines={1}
              >
                {c.other.displayName}
              </Text>
              <Text
                style={[
                  s.last,
                  c.unread > 0 && { color: "#f8fafc", fontWeight: "600" },
                ]}
                numberOfLines={1}
              >
                {c.lastMessage?.text || "Chưa có tin nhắn"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={s.time}>{formatTime(c.lastMessage?.sentAt)}</Text>
              {c.unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>
                    {c.unread > 99 ? "99+" : c.unread}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // Nền tím/xanh đen chủ đạo
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#1e293b", // Màu thẻ chat
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  last: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 14,
  },
  time: {
    color: "#64748b",
    fontSize: 12,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6366f1", // Dùng màu tím chủ đạo cho badge thông báo
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  emptySub: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
