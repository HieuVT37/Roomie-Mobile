import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  deleteAccommodationApi,
  listAccommodationsApi,
  myAccommodationsApi,
} from "../../api/accommodations";
import { useAuth } from "../../auth/AuthContext";
import { CreateAccommodationForm } from "../../components/accommodation/CreateAccommodationForm";
import { AccommodationCard } from "../../components/cards";
import {
  colors,
  Loading,
  LoginPrompt,
  Segments,
  shared,
  useBottomPad,
} from "../../components/ui";
import { listItemKey } from "../../hooks/infinite-list-utils";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";
import { accommodationErrorMessage } from "../../utils/accommodation-form";
import { getAccommodationAccess } from "../../utils/accommodation-permissions";
const themeColors = { ...colors, placeholder: colors.muted };
export default function AccommodationListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("search");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [success, setSuccess] = useState(null);
  const { user, loading: authLoading, refreshSession } = useAuth();
  const { isAuthenticated, canViewMine, canCreate, reason } =
    getAccommodationAccess(user);
  const userKey = String(user?.id ?? user?._id ?? user?.email ?? "guest");
  const bottom = useBottomPad(20);
  const listRef = useRef(null);
  useTabPressScrollTop(listRef);

  // Tự động tìm kiếm khi người dùng ngừng gõ 300ms (giống mục Pass)
  useEffect(() => {
    if (text.trim() !== q) setIsSearching(true);
    const timer = setTimeout(() => {
      setQ(text.trim());
      setIsSearching(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const listVisible =
    tab === "search" || (tab === "mine" && !authLoading && canViewMine);
  const list = useInfiniteList(
    (page) =>
      tab === "mine"
        ? myAccommodationsApi({ page, limit: 12 })
        : listAccommodationsApi({ page, limit: 12, q }),
    [q, tab, canViewMine, userKey, refreshKey, authLoading],
    { enabled: listVisible },
  );

  // Luôn trỏ tới bản refresh mới nhất để useFocusEffect không dùng bản cũ
  const refreshRef = useRef(null);
  refreshRef.current = list.refresh;
  const hasMountedRef = useRef(false);

  // Quay lại màn hình này (vd: sau khi sửa tin ở trang chi tiết) thì tải lại danh sách
  useFocusEffect(
    useCallback(() => {
      if (hasMountedRef.current) {
        refreshRef.current?.();
      } else {
        hasMountedRef.current = true;
      }
    }, []),
  );

  // Spinner kéo-để-làm-mới chỉ hiện khi người dùng tự kéo
  const handlePull = useCallback(async () => {
    setPulling(true);
    try {
      await list.refresh();
    } finally {
      setPulling(false);
    }
  }, [list.refresh]);

  // Recheck existing server data when returning from Account/Subscription.
  // Refreshing the session never resets the bootstrap loading state or form draft.
  useFocusEffect(
    useCallback(() => {
      if (tab === "search" || authLoading || !isAuthenticated) return;
      void refreshSession().catch(() => {});
    }, [tab, authLoading, isAuthenticated, refreshSession]),
  );
  // The three sections share a route; Android Back returns to the public list first.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || tab === "search") return;
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        Keyboard.dismiss();
        setTab("search");
        return true;
      });
      return () => listener.remove();
    }, [tab]),
  );
  const scrollToTop = () =>
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  const clearSearch = () => {
    setText("");
    setQ("");
    setIsSearching(false);
    scrollToTop();
    Keyboard.dismiss();
  };
  const created = () => {
    setSuccess({
      ownerKey: userKey,
      message: "Đăng tin thành công. Bài đăng của bạn được tải lại bên dưới.",
    });
    setRefreshKey((value) => value + 1);
    setTab("mine");
  };

  // Mở trang chi tiết ở chế độ chỉnh sửa
  const handleEditMine = (item) => {
    const id = item.id || item._id;
    router.push({
      pathname: "/accommodation/[id]",
      params: { id: String(id), edit: "true" },
    });
  };

  const handleDeleteMine = (item) => {
    const id = item.id || item._id;
    Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa bài "${item.title}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccommodationApi(id);
            setRefreshKey((value) => value + 1);
          } catch (err) {
            Alert.alert(
              "Lỗi",
              accommodationErrorMessage(err, "Không thể xóa bài đăng."),
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <Segments
        value={tab}
        onChange={(value) => setTab(value)}
        options={[
          { key: "search", label: "Tìm phòng" },
          { key: "mine", label: "Tin của tôi" },
          { key: "create", label: "Đăng tin" },
        ]}
      />

      {tab !== "search" &&
        (authLoading ? (
          <Loading text="Đang kiểm tra đăng nhập..." />
        ) : !isAuthenticated ? (
          <LoginPrompt text="Đăng nhập để xem bài của bạn và đăng tin cho thuê phòng." />
        ) : tab === "create" ? (
          canCreate ? (
            <CreateAccommodationForm key={userKey} onSuccess={created} />
          ) : (
            <AccommodationAccessNotice reason={reason} />
          )
        ) : null)}

      {listVisible && (
        <View style={s.listArea}>
          {tab === "search" ? (
            <>
              <View style={s.searchRow}>
                <View style={s.searchInputWrap}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="#64748b"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    accessibilityLabel="Tìm phòng theo khu vực hoặc tiêu đề"
                    style={s.searchInput}
                    placeholder="Tiêu đề, quận, phường..."
                    placeholderTextColor="#64748b"
                    value={text}
                    onChangeText={setText}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  {isSearching && (
                    <View style={{ padding: 4 }}>
                      <Ionicons
                        name="hourglass-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  {text.length > 0 && !isSearching && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xóa tìm kiếm"
                      hitSlop={8}
                      onPress={clearSearch}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </Pressable>
                  )}
                </View>
              </View>
              {!!q && <Text style={s.query}>Kết quả cho “{q}”</Text>}
            </>
          ) : (
            ""
          )}

          {tab === "mine" && success?.ownerKey === userKey && (
            <View accessibilityRole="alert" style={s.successBox}>
              <Text style={s.successText}>{success.message}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng thông báo"
                hitSlop={8}
                onPress={() => setSuccess(null)}
              >
                <Text style={s.successText}>✕</Text>
              </Pressable>
            </View>
          )}

          {list.loading && (tab !== "search" || !q) ? (
            <Loading />
          ) : (
            <FlatList
              key={tab + ":" + userKey}
              ref={listRef}
              style={s.listArea}
              data={list.items}
              keyExtractor={(item, index) =>
                listItemKey(item) ?? "unidentified-" + index
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[s.listContent, { paddingBottom: bottom }]}
              refreshControl={
                <RefreshControl
                  refreshing={pulling}
                  onRefresh={handlePull}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              onEndReachedThreshold={0.4}
              onEndReached={list.loadMore}
              ListHeaderComponent={
                !!list.error && list.items.length > 0 ? (
                  <View accessibilityRole="alert" style={s.errorBox}>
                    <Text style={s.errorText}>{list.error}</Text>
                    <Pressable
                      accessibilityRole="button"
                      style={s.retryButton}
                      onPress={list.refresh}
                    >
                      <Text style={s.buttonText}>Tải lại</Text>
                    </Pressable>
                  </View>
                ) : undefined
              }
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Text style={[shared.empty, { textAlign: "center" }]}>
                    {list.error ||
                      (q
                        ? `Không tìm thấy phòng ở khu vực "${q}".`
                        : tab === "mine"
                          ? "Bạn chưa có bài đăng nào."
                          : "Chưa có phòng nào được đăng.")}
                  </Text>
                  {list.error ? (
                    <Pressable
                      style={s.clearFilterEmptyBtn}
                      onPress={list.refresh}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#fff" />
                      <Text style={s.clearFilterEmptyBtnText}>Thử lại</Text>
                    </Pressable>
                  ) : tab === "mine" ? (
                    <Pressable
                      style={s.clearFilterEmptyBtn}
                      onPress={() => setTab("create")}
                    >
                      <Text style={s.clearFilterEmptyBtnText}>
                        {canCreate
                          ? "Đăng tin đầu tiên"
                          : "Xem điều kiện đăng tin"}
                      </Text>
                    </Pressable>
                  ) : !!q ? (
                    <Pressable
                      style={s.clearFilterEmptyBtn}
                      onPress={clearSearch}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#fff" />
                      <Text style={s.clearFilterEmptyBtnText}>
                        Xóa bộ lọc & Tải lại
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              }
              ListFooterComponent={
                list.loadingMore ? (
                  <View style={s.footer}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={s.hint}>Đang tải thêm...</Text>
                  </View>
                ) : undefined
              }
              renderItem={({ item }) =>
                tab === "mine" ? (
                  <View>
                    <AccommodationCard item={item} />
                    <View style={s.mineActionRow}>
                      <View style={s.mineStatusWrap}>
                        <View
                          style={[
                            s.dotStatus,
                            {
                              backgroundColor:
                                item.moderationStatus === "approved"
                                  ? "#10b981"
                                  : item.moderationStatus === "rejected"
                                    ? "#ef4444"
                                    : "#d97706",
                            },
                          ]}
                        />
                        <Text style={s.moderationText}>
                          {item.moderationStatus === "approved"
                            ? "Đã duyệt công khai"
                            : item.moderationStatus === "rejected"
                              ? "Bị từ chối"
                              : "Chờ quản trị duyệt"}
                        </Text>
                      </View>
                      <Pressable
                        style={s.mineEditBtn}
                        onPress={() => handleEditMine(item)}
                      >
                        <Text style={s.mineEditBtnText}>Sửa</Text>
                      </Pressable>
                      <Pressable
                        style={s.mineDeleteBtn}
                        onPress={() => handleDeleteMine(item)}
                      >
                        <Text style={s.mineDeleteBtnText}>Xóa</Text>
                      </Pressable>
                    </View>
                    {item.moderationStatus === "rejected" &&
                      !!item.rejectionReason && (
                        <Text style={s.rejectReason}>
                          Lý do từ chối: {item.rejectionReason}
                        </Text>
                      )}
                  </View>
                ) : (
                  <AccommodationCard item={item} />
                )
              }
            />
          )}
        </View>
      )}
    </View>
  );
}
function AccommodationAccessNotice({ reason }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const recheck = async () => {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    setError("");
    try {
      await refreshSession({ force: true });
    } catch (failure) {
      if (mounted.current)
        setError(
          accommodationErrorMessage(
            failure,
            "Chưa cập nhật được quyền tài khoản. Vui lòng thử lại.",
          ),
        );
    } finally {
      pending.current = false;
      if (mounted.current) setRefreshing(false);
    }
  };
  const needsPlan = reason === "plan";
  return (
    <View style={s.noticeContainer}>
      <View style={s.noticeCard}>
        <Text style={s.noticeIcon}>{needsPlan ? "⭐" : "🏠"}</Text>
        <Text style={s.noticeTitle}>
          {needsPlan
            ? "Cần gói Plus hoặc Pro để đăng tin"
            : "Tài khoản chưa có quyền chủ trọ"}
        </Text>
        <Text style={s.noticeText}>
          {needsPlan
            ? "Bạn vẫn có thể xem các bài đã đăng trong Tin của tôi. Nâng cấp gói để đăng tin mới."
            : "Đăng tin cho thuê yêu cầu quyền chủ trọ và gói Plus hoặc Pro. Nâng cấp gói không tự cấp quyền chủ trọ."}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={s.upgradeBtn}
          onPress={() =>
            router.push(needsPlan ? "/account/subscription" : "/(tabs)/account")
          }
        >
          <Text style={s.upgradeBtnText}>
            {needsPlan ? "Xem gói dịch vụ" : "Xem tài khoản"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: refreshing, busy: refreshing }}
          disabled={refreshing}
          style={s.recheckButton}
          onPress={recheck}
        >
          {refreshing && <ActivityIndicator color={colors.primary} />}
          <Text style={s.noticeText}>
            {refreshing ? "Đang cập nhật..." : "Kiểm tra lại quyền tài khoản"}
          </Text>
        </Pressable>
        {!!error && (
          <Text accessibilityRole="alert" style={s.errorText}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listArea: { flex: 1 },
  listContent: { padding: 12, gap: 12, flexGrow: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  query: {
    color: colors.muted,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
  },
  mineHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mineTitleWrap: { flex: 1, gap: 4 },
  heading: { fontSize: 20, fontWeight: "700", color: colors.text },
  hint: { fontSize: 13, lineHeight: 20, color: colors.muted },
  newButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: "center",
  },
  successBox: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  successText: {
    color: "#86efac",
    fontSize: 13,
    lineHeight: 20,
    flexShrink: 1,
  },
  errorBox: {
    backgroundColor: colors.card,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  errorText: { color: "#fca5a5", lineHeight: 20 },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  clearFilterEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  clearFilterEmptyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  footer: { padding: 16, alignItems: "center", gap: 8 },
  // Thanh quản lý trong "Tin của tôi" (giống mục Pass)
  mineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -8,
    gap: 8,
  },
  mineStatusWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotStatus: { width: 8, height: 8, borderRadius: 4 },
  moderationText: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  mineEditBtn: {
    backgroundColor: "#312e81",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mineEditBtnText: { color: "#a5b4fc", fontWeight: "600", fontSize: 12 },
  mineDeleteBtn: {
    backgroundColor: "#450a0a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mineDeleteBtnText: { color: "#fca5a5", fontWeight: "600", fontSize: 12 },
  rejectReason: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  noticeContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  noticeIcon: { fontSize: 40, marginBottom: 12 },
  noticeTitle: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  noticeText: {
    color: themeColors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  upgradeBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  recheckButton: {
    minHeight: 44,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginTop: 8,
  },
});
