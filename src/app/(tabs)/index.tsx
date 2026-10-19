import { useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { listAccommodationsApi } from "../../api/accommodations";
import { AccommodationCard } from "../../components/cards";
import { Loading, shared } from "../../components/ui";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen)
const themeColors = {
  bg: "#0f172a", // Nền xanh đen tối toàn màn hình
  card: "#1e293b", // Nền ô tìm kiếm
  border: "#334155", // Viền ô tìm kiếm
  text: "#f8fafc", // Màu chữ nhập vào
  placeholder: "#64748b", // Màu chữ gợi ý (placeholder)
  primary: "#6366f1", // Tím điểm nhấn cho RefreshControl
};

export default function AccommodationListScreen() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);
  const list = useInfiniteList(
    (p) => listAccommodationsApi({ page: p, limit: 12, q }),
    [q],
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <TextInput
        style={s.searchBox}
        placeholder="Tìm theo tiêu đề, quận, phường..."
        placeholderTextColor={themeColors.placeholder}
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
              {list.error || "Không có tin nào phù hợp."}
            </Text>
          }
          renderItem={({ item }) => <AccommodationCard item={item} />}
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
