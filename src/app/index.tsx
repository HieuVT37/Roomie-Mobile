import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { imageUrl } from "../api/axios";
import { listPassApi } from "../api/pass";
import { useAuth } from "../auth/AuthContext";
import { PASS_TYPE_LABELS, passPriceText } from "../utils/labels";

export default function PassListScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const load = useCallback(async (nextPage: number, replace = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const data = await listPassApi({ page: nextPage, limit: 12 });
      setPage(data.page);
      setPages(data.pages);
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setError("");
    } catch (err: any) {
      setError(
        err.code === "ECONNABORTED"
          ? "Máy chủ đang khởi động, kéo xuống để thử lại"
          : err.response?.data?.message || "Không tải được danh sách",
      );
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    load(1, true).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          headerRight: () =>
            user ? (
              <Pressable onPress={logout}>
                <Text style={s.headerLink}>Đăng xuất</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push("/login")}>
                <Text style={s.headerLink}>Đăng nhập</Text>
              </Pressable>
            ),
        }}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" />
          <Text style={s.muted}>
            Đang tải... (lần đầu có thể mất khoảng 1 phút)
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => page < pages && load(page + 1)}
          ListEmptyComponent={
            <Text style={s.muted}>{error || "Chưa có bài Pass nào."}</Text>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              {item.images?.[0] ? (
                <Image
                  source={{ uri: imageUrl(item.images[0]) as string }}
                  style={s.cover}
                />
              ) : (
                <View style={[s.cover, s.center]}>
                  <Text style={{ fontSize: 40 }}>📦</Text>
                </View>
              )}
              <View style={{ padding: 12, gap: 4 }}>
                <Text style={s.badge}>
                  {(PASS_TYPE_LABELS as any)[item.type]}
                </Text>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.price}>{passPriceText(item)}</Text>
                {item.area ? <Text style={s.muted}>📍 {item.area}</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  cover: { width: "100%", height: 180, backgroundColor: "#eee" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#4f46e5",
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  title: { fontSize: 17, fontWeight: "600" },
  price: { fontSize: 16, color: "#4f46e5", fontWeight: "700" },
  muted: { color: "#666" },
  headerLink: { color: "#4f46e5", fontWeight: "600" },
});
