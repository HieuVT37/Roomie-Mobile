import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { listFavoritesApi } from "../api/favorites";
import { useAuth } from "../auth/AuthContext";
import { AccommodationCard, PassCard } from "../components/cards";
import { Loading, LoginPrompt, Segments, useBottomPad } from "../components/ui";

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [type, setType] = useState("accommodation");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const bottom = useBottomPad(12);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await listFavoritesApi(type);
      setItems(data.items);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tải được danh sách");
    }
  }, [type, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  if (!user) return <LoginPrompt text="Đăng nhập để xem các tin bạn đã lưu." />;

  return (
    <View style={styles.container}>
      {/* Thanh Segments chuyển đổi tab */}
      <View style={styles.segmentWrapper}>
        <Segments
          value={type}
          onChange={setType}
          options={[
            { key: "accommodation", label: "Phòng trọ" },
            { key: "pass", label: "Pass" },
          ]}
        />
      </View>

      {loading ? (
        <Loading text="Đang tải..." />
      ) : (
        <FlatList
          key={type}
          data={items}
          keyExtractor={(it) => it.id || it._id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: bottom,
            gap: 12,
          }}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {type === "accommodation" ? "🏠" : "📦"}
              </Text>
              <Text style={styles.emptyTitle}>Chưa có tin yêu thích</Text>
              <Text style={styles.emptySub}>
                {error || "Các bài đăng bạn bấm thả tim sẽ xuất hiện ở đây."}
              </Text>
            </View>
          }
          renderItem={({ item }) =>
            type === "pass" ? (
              <PassCard item={item} />
            ) : (
              <AccommodationCard item={item} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // Nền tím/xanh đậm chủ đạo
  },
  segmentWrapper: {
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingVertical: 8,
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
