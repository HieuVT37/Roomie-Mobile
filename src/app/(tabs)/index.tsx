import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  deleteAccommodationApi,
  listAccommodationsApi,
  myAccommodationsApi,
  setAccommodationStatusApi,
} from "../../api/accommodations";
import { useAuth } from "../../auth/AuthContext";
import { CreateAccommodationForm } from "../../components/accommodation/CreateAccommodationForm";
import { AccommodationCard, AccommodationMineCard } from "../../components/cards";
import { colors, Loading, LoginPrompt, Segments, useBottomPad } from "../../components/ui";
import { listItemKey } from "../../hooks/infinite-list-utils";
import { useInfiniteList, useTabPressScrollTop } from "../../hooks/use-infinite-list";
import { accommodationErrorMessage } from "../../utils/accommodation-form";
import { getAccommodationAccess, type AccommodationAccessReason } from "../../utils/accommodation-permissions";
import { LISTING_STATUS_LABELS, normalizeVietnamese } from "../../utils/labels";

const themeColors = { ...colors, placeholder: colors.muted };
type AccommodationTab = "search" | "mine" | "create";

export default function AccommodationListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<AccommodationTab>("search");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [success, setSuccess] = useState<{ ownerKey: string; message: string } | null>(null);
  const { user, loading: authLoading, refreshSession } = useAuth();
  const { isAuthenticated, canViewMine, canCreate, reason } = getAccommodationAccess(user);
  const userKey = String(user?.id ?? user?._id ?? user?.email ?? "guest");
  const bottom = useBottomPad(20);
  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);
  
  // State cho modal chỉnh sửa
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Auto search với debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(text.trim());
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const listVisible = tab === "search" || (tab === "mine" && !authLoading && canViewMine);
  
  const fetchAccommodations = useCallback(
    async (page: number) => {
      if (tab === "mine") {
        return myAccommodationsApi({ page, limit: 12 });
      }
      
      // Không truyền q vào API, tải toàn bộ để client-side filter
      try {
        const res = await listAccommodationsApi({ page, limit: 12 });
        // Nếu có q mà server trả về rỗng, tải fallback
        if (q && (!res?.items || res.items.length === 0)) {
          const fallback = await listAccommodationsApi({ page, limit: 12 });
          return fallback;
        }
        return res;
      } catch {
        return listAccommodationsApi({ page, limit: 12 });
      }
    },
    [tab, q],
  );

  const list = useInfiniteList(
    fetchAccommodations,
    [tab, canViewMine, userKey, refreshKey, authLoading, q],
    { enabled: listVisible },
  );

  // Client-side filtering - Tìm kiếm theo địa chỉ và khu vực
  const displayItems = useMemo(() => {
    const serverItems = list.items || [];
    
    // Chỉ hiển thị tin đã được duyệt ở tab search
    let filtered = tab === "search" 
      ? serverItems.filter((item: any) => item.moderationStatus === "approved")
      : serverItems;
    
    if (tab !== "search" || !q) return filtered;

    if (q.trim().length < 2) return filtered;

    const normQ = normalizeVietnamese(q);
    
    filtered = filtered.filter((item: any) => {
      let addressStr = "";
      if (typeof item.address === "string") {
        addressStr = item.address;
      } else if (item.address && typeof item.address === "object") {
        const addrParts = [
          item.address.street,
          item.address.ward,
          item.address.district,
          item.address.city,
        ].filter(Boolean);
        addressStr = addrParts.join(" ");
      }
      const addrNorm = normalizeVietnamese(addressStr);
      
      return addrNorm.includes(normQ);
    });
    
    return filtered;
  }, [list.items, tab, q]);

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

  const scrollToTop = () => listRef.current?.scrollToOffset({ offset: 0, animated: false });
  const clearSearch = () => {
    setText("");
    setQ("");
    setIsSearching(false);
    scrollToTop();
    Keyboard.dismiss();
  };
  const created = () => {
    setSuccess({ ownerKey: userKey, message: "Đã gửi bài đăng. Bài viết đang chờ quản trị viên duyệt và sẽ hiển thị ở tab 'Tin của tôi'." });
    setRefreshKey((value) => value + 1);
    setTab("mine");
  };

  const handleDeleteAccommodation = (item: any) => {
    const id = item.id || item._id;
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc muốn xóa bài đăng "${item.title}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccommodationApi(id);
              Alert.alert("Thành công", "Đã xóa bài đăng.");
              list.refresh();
            } catch (err: any) {
              Alert.alert(
                "Lỗi",
                err.response?.data?.message || "Không thể xóa bài đăng.",
              );
            }
          },
        },
      ],
    );
  };

  const handleSetAccommodationStatus = async (item: any, status: "active" | "completed" | "closed") => {
    const id = item.id || item._id;
    try {
      await setAccommodationStatusApi(id, status);
      Alert.alert(
        "Thành công",
        `Đã cập nhật trạng thái bài viết thành "${(LISTING_STATUS_LABELS as any)[status] || status}".`,
      );
      list.refresh();
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    }
  };

  return (
    <View style={s.container}>
      <Segments
        value={tab}
        onChange={(value) => setTab(value as AccommodationTab)}
        options={[
          { key: "search", label: "Tìm phòng" },
          { key: "mine", label: "Tin của tôi" },
          { key: "create", label: "Đăng tin" },
        ]}
      />

      {tab !== "search" && (
        authLoading ? <Loading text="Đang kiểm tra đăng nhập..." /> :
        !isAuthenticated ? <LoginPrompt text="Đăng nhập để xem bài của bạn và đăng tin cho thuê phòng." /> :
        tab === "create" ? (
          canCreate
            ? <CreateAccommodationForm key={userKey} onSuccess={created} />
            : <AccommodationAccessNotice reason={reason} />
        ) : null
      )}

      {listVisible && (
        <View style={s.listArea}>
          {tab === "search" && (
            <View style={s.searchContainer}>
              <View style={s.searchBar}>
                <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  accessibilityLabel="Tìm phòng theo khu vực"
                  style={s.searchInput}
                  placeholder="Tìm theo khu vực (quận, phường, địa chỉ)..."
                  placeholderTextColor="#64748b"
                  value={text}
                  onChangeText={(val) => {
                    setText(val);
                    if (val.trim()) setIsSearching(true);
                  }}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {isSearching && (
                  <View style={{ padding: 4 }}>
                    <Ionicons name="hourglass-outline" size={18} color={colors.primary} />
                  </View>
                )}
                {text.length > 0 && !isSearching && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xóa tìm kiếm"
                    hitSlop={8}
                    style={{ padding: 4 }}
                    onPress={clearSearch}
                  >
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {tab === "mine" && success?.ownerKey === userKey && (
            <View accessibilityRole="alert" style={s.successBox}>
              <Text style={s.successText}>{success.message}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" hitSlop={8} onPress={() => setSuccess(null)}>
                <Text style={s.successText}>✕</Text>
              </Pressable>
            </View>
          )}

          {list.loading ? <Loading /> : (
            <FlatList
              key={tab + ":" + userKey}
              ref={listRef}
              style={s.listArea}
              data={displayItems}
              keyExtractor={(item, index) => listItemKey(item) ?? "unidentified-" + index}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[s.listContent, { paddingBottom: bottom }]}
              refreshControl={
                <RefreshControl
                  refreshing={list.refreshing}
                  onRefresh={list.refresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              onEndReachedThreshold={0.4}
              onEndReached={list.loadMore}
              ListHeaderComponent={!!list.error && list.items.length > 0 ? (
                <View accessibilityRole="alert" style={s.errorBox}>
                  <Text style={s.errorText}>{list.error}</Text>
                  <Pressable accessibilityRole="button" style={s.retryButton} onPress={list.refresh}>
                    <Text style={s.buttonText}>Tải lại</Text>
                  </Pressable>
                </View>
              ) : undefined}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>{list.error ? "⚠️" : "🏠"}</Text>
                  <Text style={s.emptyTitle}>
                    {list.error ? "Chưa tải được danh sách" : tab === "mine" ? "Bạn chưa có bài đăng nào" : q ? `Không tìm thấy phòng ở khu vực "${q}"` : "Không tìm thấy phòng phù hợp"}
                  </Text>
                  <Text style={s.hint}>
                    {list.error || (tab === "mine"
                      ? ""
                      : q ? "Thử nhập tên quận, phường hoặc địa chỉ khác." : "Kéo xuống để tải lại danh sách phòng.")}
                  </Text>
                  {list.error ? (
                    <Pressable accessibilityRole="button" style={s.retryButton} onPress={list.refresh}>
                      <Text style={s.buttonText}>Thử lại</Text>
                    </Pressable>
                  ) : tab === "mine" ? (
                    <Pressable accessibilityRole="button" style={s.retryButton} onPress={() => setTab("create")}>
                      <Text style={s.buttonText}>{canCreate ? "Đăng tin đầu tiên" : "Xem điều kiện đăng tin"}</Text>
                    </Pressable>
                  ) : q ? (
                    <Pressable accessibilityRole="button" style={s.retryButton} onPress={clearSearch}>
                      <Text style={s.buttonText}>Xóa bộ lọc & Tải lại</Text>
                    </Pressable>
                  ) : null}
                </View>
              }
              ListFooterComponent={list.loadingMore ? (
                <View style={s.footer}><ActivityIndicator color={colors.primary} /><Text style={s.hint}>Đang tải thêm...</Text></View>
              ) : undefined}
              renderItem={({ item }) =>
                tab === "mine" ? (
                  <AccommodationMineCard
                    item={item}
                    onEdit={() => {
                      
                      setEditingItem(item);
                      setShowEditModal(true);
                    }}
                    onDelete={() => handleDeleteAccommodation(item)}
                    onSetStatus={item.moderationStatus === "approved" ? (status) => handleSetAccommodationStatus(item, status) : undefined}
                  />
                ) : (
                  <AccommodationCard item={item} showStatus={false} />
                )
              }
            />
          )}
        </View>
      )}

      {/* Modal Chỉnh sửa bài đăng */}
      {showEditModal && editingItem && (
        <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {/* Modal Header */}
            <View style={sModal.header}>
              <Pressable onPress={() => {
                setShowEditModal(false);
                setEditingItem(null);
              }} style={sModal.headerBtn}>
                <Text style={{ color: colors.muted, fontSize: 16 }}>Hủy</Text>
              </Pressable>
              <Text style={sModal.headerTitle}>Chỉnh sửa bài đăng</Text>
              <View style={sModal.headerBtn} />
            </View>
            
            {/* Form sử dụng component CreateAccommodationForm với mode="edit" */}
            <CreateAccommodationForm
              mode="edit"
              initialData={editingItem}
              initialContact={
                editingItem.listing?.contact ||
                editingItem.listing?.contactPhone || 
                editingItem.contact ||
                editingItem.contactPhone || 
                ""
              }
              accommodationId={String(editingItem.id || editingItem._id)}
              onSuccess={() => {
                setShowEditModal(false);
                setEditingItem(null);
                list.refresh();
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

function AccommodationAccessNotice({ reason }: { reason: AccommodationAccessReason }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const recheck = async () => {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    setError("");
    try {
      await refreshSession({ force: true });
    } catch (failure: unknown) {
      if (mounted.current) setError(accommodationErrorMessage(failure, "Chưa cập nhật được quyền tài khoản. Vui lòng thử lại."));
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
        <Text style={s.noticeTitle}>{needsPlan ? "Cần gói Plus hoặc Pro để đăng tin" : "Tài khoản chưa có quyền chủ trọ"}</Text>
        <Text style={s.noticeText}>
          {needsPlan
            ? "Bạn vẫn có thể xem các bài đã đăng trong Tin của tôi. Nâng cấp gói để đăng tin mới."
            : "Đăng tin cho thuê yêu cầu quyền chủ trọ và gói Plus hoặc Pro. Nâng cấp gói không tự cấp quyền chủ trọ."}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={s.upgradeBtn}
          onPress={() => router.push(needsPlan ? "/account/subscription" : "/(tabs)/account")}
        >
          <Text style={s.upgradeBtnText}>{needsPlan ? "Xem gói dịch vụ" : "Xem tài khoản"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: refreshing, busy: refreshing }}
          disabled={refreshing}
          style={s.recheckButton}
          onPress={recheck}
        >
          {refreshing && <ActivityIndicator color={colors.primary} />}
          <Text style={s.noticeText}>{refreshing ? "Đang cập nhật..." : "Kiểm tra lại quyền tài khoản"}</Text>
        </Pressable>
        {!!error && <Text accessibilityRole="alert" style={s.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listArea: { flex: 1 },
  listContent: { padding: 12, gap: 12, flexGrow: 1 },
  
  // Thanh tìm kiếm giống Pass phòng
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 0,
    marginBottom: 12,
    gap: 8,
  },
  searchBar: {
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
  
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 8 },
  searchInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12 },
  clearButton: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  clearText: { color: colors.muted, fontSize: 19 },
  searchButton: { minHeight: 48, minWidth: 54, justifyContent: "center", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.primary },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  query: { color: colors.muted, paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
  mineHeader: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  mineTitleWrap: { flex: 1, gap: 4 },
  heading: { fontSize: 20, fontWeight: "700", color: colors.text },
  hint: { fontSize: 13, lineHeight: 20, color: colors.muted },
  newButton: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44, borderRadius: 10, justifyContent: "center" },
  successBox: { marginHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: "#22c55e", backgroundColor: colors.card, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  successText: { color: "#86efac", fontSize: 13, lineHeight: 20, flexShrink: 1 },
  errorBox: { backgroundColor: colors.card, borderColor: colors.danger, borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  errorText: { color: "#fca5a5", lineHeight: 20 },
  retryButton: { paddingHorizontal: 18, paddingVertical: 12, minHeight: 44, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center", alignSelf: "center" },
  empty: { padding: 24, paddingTop: 44, alignItems: "center", gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: 17, textAlign: "center" },
  footer: { padding: 16, alignItems: "center", gap: 8 },
  noticeContainer: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center" },
  noticeCard: { backgroundColor: themeColors.card, borderWidth: 1, borderColor: themeColors.border, borderRadius: 20, padding: 24, alignItems: "center", width: "100%" },
  noticeIcon: { fontSize: 40, marginBottom: 12 },
  noticeTitle: { color: themeColors.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  noticeText: { color: themeColors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  upgradeBtn: { backgroundColor: themeColors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20, width: "100%", alignItems: "center" },
  upgradeBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  recheckButton: { minHeight: 44, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 10, marginTop: 8 },
  
  // Style cho quản lý bài đăng
  mineActionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 12,
    gap: 8,
    marginTop: -16,
  },
  dotStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moderationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  mineEditBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mineEditBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  mineDeleteBtn: {
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mineDeleteBtnText: {
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: "700",
  },
  rejectionBox: {
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  rejectionLabel: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  rejectionText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
  },
  statusBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
});

// Styles cho Modal header
const sModal = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerBtn: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
});
