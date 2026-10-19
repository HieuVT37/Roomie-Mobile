import { useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { listPassApi } from "../../api/pass";
import { PassCard } from "../../components/cards";
import { Loading, shared } from "../../components/ui";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen)
const themeColors = {
  bg: "#0f172a", // Nền chính
  card: "#1e293b", // Nền thanh tìm kiếm / thẻ
  border: "#334155", // Viền
  text: "#f8fafc", // Chữ chính
  muted: "#94a3b8", // Chữ phụ
  primary: "#6366f1", // Màu tím chủ đạo
};

export default function PassListScreen() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);
  const list = useInfiniteList(
    (p) => listPassApi({ page: p, limit: 12, q }),
    [q],
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <TextInput
        style={s.searchBox}
        placeholder="Tìm đồ hoặc phòng đang pass..."
        placeholderTextColor="#64748b"
        value={text}
        onChangeText={setText}
        returnKeyType="search"
        onSubmitEditing={() => setQ(text.trim())}
      />
      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: themeColors.bg }}
          ref={listRef}
          data={list.items}
          keyExtractor={(it) => it.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              tintColor={themeColors.primary}
              colors={[themeColors.primary]}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={list.loadMore}
          ListEmptyComponent={
            <Text style={shared.empty}>
              {list.error || "Chưa có bài Pass nào."}
            </Text>
          }
          renderItem={({ item }) => <PassCard item={item} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchBox: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: themeColors.text,
    fontSize: 14,
  },
});
