import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { useLanguage } from "../../context/LanguageContext";
import useConversationMetas from "../../firebase/useConversationMetas";

export default function MessagesScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listConversationsApi();
      setItems(data.items || []);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || t.messages.loadError);
    }
  }, [user, t.messages.loadError]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
      const timer = setInterval(load, 10000);
      return () => clearInterval(timer);
    }, [load]),
  );

  // Lắng nghe cập nhật tin nhắn cuối realtime từ Firestore cho toàn bộ cuộc trò chuyện
  const convIds = useMemo(() => items.map((c) => String(c.id)), [items]);
  const firestoreMetas: Record<string, any> = useConversationMetas(convIds);

  const mergedItems = useMemo(() => {
    return items.map((c) => {
      const fbMeta = firestoreMetas[String(c.id)];
      if (!fbMeta?.lastMessage) return c;

      const fbSentAt = fbMeta.lastMessage.sentAt || "";
      const apiSentAt = c.lastMessage?.sentAt || "";
      if (fbSentAt && (!apiSentAt || new Date(fbSentAt) >= new Date(apiSentAt))) {
        return {
          ...c,
          lastMessage: {
            ...c.lastMessage,
            text: fbMeta.lastMessage.text,
            images: fbMeta.lastMessage.images || [],
            sentAt: fbSentAt,
          },
        };
      }
      return c;
    });
  }, [items, firestoreMetas]);

  if (authLoading) return <Loading text={t.common.checkingAuth} />;
  if (!user) return <LoginPrompt text={t.messages.loginPrompt} />;
  if (loading) return <Loading text={t.common.loading} />;

  return (
    <View style={s.container}>
      <FlatList
        data={mergedItems}
        keyExtractor={(c) => String(c.id)}
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
            <Text style={s.emptyTitle}>{t.messages.emptyTitle}</Text>
            <Text style={s.emptySub}>{error || t.messages.emptySub}</Text>
          </View>
        }
        renderItem={({ item: c }) => {
          const lastText =
            c.lastMessage?.text ||
            (c.lastMessage?.images?.length
              ? t.messages.sentImage
              : t.messages.noMessageYet);

          return (
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: c.id, name: c.other?.displayName },
                })
              }
            >
              <Avatar
                uri={c.other?.avatarUrl}
                name={c.other?.displayName}
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
                  {c.other?.displayName}
                </Text>
                <Text
                  style={[
                    s.last,
                    c.unread > 0 && { color: "#f8fafc", fontWeight: "600" },
                  ]}
                  numberOfLines={1}
                >
                  {lastText}
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
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
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
    backgroundColor: "#1e293b",
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
    backgroundColor: "#6366f1",
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
