import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  useBottomPad,
} from "../../components/ui";
import { listItemKey } from "../../hooks/infinite-list-utils";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";
import { accommodationErrorMessage } from "../../utils/accommodation-form";
import {
  getAccommodationAccess,
  type AccommodationAccessReason,
} from "../../utils/accommodation-permissions";

const themeColors = { ...colors, placeholder: colors.muted };
type AccommodationTab = "search" | "mine" | "create";

export default function AccommodationListScreen() {
  const [tab, setTab] = useState<AccommodationTab>("search");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [success, setSuccess] = useState<{
    ownerKey: string;
    message: string;
  } | null>(null);
  const { user, loading: authLoading, refreshSession } = useAuth();
  const { isAuthenticated, canViewMine, canCreate, reason } =
    getAccommodationAccess(user);
  const userKey = String(user?.id ?? user?._id ?? user?.email ?? "guest");
  const bottom = useBottomPad(20);
  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);

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
  const search = () => {
    setQ(text.trim());
    scrollToTop();
    Keyboard.dismiss();
  };
  const clearSearch = () => {
    setText("");
    setQ("");
    scrollToTop();
    Keyboard.dismiss();
  };
  const changeSearchText = (value: string) => {
    setText(value);
    if (!value.trim()) {
      setQ("");
      scrollToTop();
    }
  };
  const created = () => {
    setSuccess({
      ownerKey: userKey,
      message: "Đăng tin thành công. Bài đăng của bạn được tải lại bên dưới.",
    });
    setRefreshKey((value) => value + 1);
    setTab("mine");
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
                  <TextInput
                    accessibilityLabel="Tìm phòng theo khu vực hoặc tiêu đề"
                    style={s.searchInput}
                    placeholder="Tiêu đề, quận, phường..."
                    placeholderTextColor={themeColors.placeholder}
                    value={text}
                    onChangeText={changeSearchText}
                    returnKeyType="search"
                    onSubmitEditing={search}
                    autoCorrect={false}
                  />
                  {!!(text || q) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xóa tìm kiếm"
                      hitSlop={4}
                      style={s.clearButton}
                      onPress={clearSearch}
                    >
                      <Text style={s.clearText}>✕</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={s.searchButton}
                  onPress={search}
                >
                  <Text style={s.buttonText}>Tìm</Text>
                </Pressable>
              </View>
              {!!q && <Text style={s.query}>Kết quả cho “{q}”</Text>}
            </>
          ) : (
            <View style={s.mineHeader}>
              <View style={s.mineTitleWrap}>
                <Text style={s.heading}>Bài đăng của bạn</Text>
                <Text style={s.hint}>
                  Xem thông tin và trạng thái từng phòng.
                </Text>
              </View>
              {canCreate && (
                <Pressable
                  accessibilityRole="button"
                  style={s.newButton}
                  onPress={() => setTab("create")}
                >
                  <Text style={s.buttonText}>+ Đăng tin</Text>
                </Pressable>
              )}
            </View>
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

          {list.loading ? (
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
                  refreshing={list.refreshing}
                  onRefresh={list.refresh}
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
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>{list.error ? "⚠️" : "🏠"}</Text>
                  <Text style={s.emptyTitle}>
                    {list.error
                      ? "Chưa tải được danh sách"
                      : tab === "mine"
                        ? "Bạn chưa có bài đăng nào"
                        : "Không tìm thấy phòng phù hợp"}
                  </Text>
                  <Text style={s.hint}>
                    {list.error ||
                      (tab === "mine"
                        ? "Bài đăng sau khi tạo thành công sẽ xuất hiện tại đây."
                        : q
                          ? "Thử khu vực hoặc từ khóa khác, hoặc xóa tìm kiếm."
                          : "Kéo xuống để tải lại danh sách phòng.")}
                  </Text>
                  {list.error ? (
                    <Pressable
                      accessibilityRole="button"
                      style={s.retryButton}
                      onPress={list.refresh}
                    >
                      <Text style={s.buttonText}>Thử lại</Text>
                    </Pressable>
                  ) : tab === "mine" ? (
                    <Pressable
                      accessibilityRole="button"
                      style={s.retryButton}
                      onPress={() => setTab("create")}
                    >
                      <Text style={s.buttonText}>
                        {canCreate
                          ? "Đăng tin đầu tiên"
                          : "Xem điều kiện đăng tin"}
                      </Text>
                    </Pressable>
                  ) : !!(text || q) ? (
                    <Pressable
                      accessibilityRole="button"
                      style={s.retryButton}
                      onPress={clearSearch}
                    >
                      <Text style={s.buttonText}>Xóa tìm kiếm</Text>
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
              renderItem={({ item }) => (
                <AccommodationCard item={item} showStatus={tab === "mine"} />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

function AccommodationAccessNotice({
  reason,
}: {
  reason: AccommodationAccessReason;
}) {
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
    } catch (failure: unknown) {
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
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  clearButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { color: colors.muted, fontSize: 19 },
  searchButton: {
    minHeight: 48,
    minWidth: 54,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
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
  empty: { padding: 24, paddingTop: 44, alignItems: "center", gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 17,
    textAlign: "center",
  },
  footer: { padding: 16, alignItems: "center", gap: 8 },
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
