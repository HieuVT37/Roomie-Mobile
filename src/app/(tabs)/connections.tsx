import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  acceptApi,
  cancelApi,
  connectionSummaryApi,
  disconnectApi,
  listConnectionsApi,
  markSeenApi,
  rejectApi,
  sendRequestApi,
} from "../../api/connections";
import { startConversationApi } from "../../api/conversations";
import { listMatchesApi } from "../../api/matching";
import { useAuth } from "../../auth/AuthContext";
import {
  Avatar,
  Chip,
  Loading,
  LoginPrompt,
  Segments,
  shared,
} from "../../components/ui";
import { useNotifications } from "../../context/NotificationContext";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";
import {
  GENDER_LABELS,
  formatBudget,
  normalizeVietnamese,
} from "../../utils/labels";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen)
const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
  danger: "#ef4444",
};

const errorText = (err: any) =>
  err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";

export default function ConnectionsScreen() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("match");
  const [summary, setSummary] = useState<any>(null);

  const loadSummary = useCallback(() => {
    if (user)
      connectionSummaryApi()
        .then(setSummary)
        .catch(() => {});
  }, [user]);
  useFocusEffect(loadSummary);

  if (loading) return <Loading text="Đang kiểm tra đăng nhập..." />;
  if (!user)
    return (
      <LoginPrompt text="Đăng nhập để xem gợi ý bạn cùng phòng và quản lý kết nối." />
    );

  const u = summary?.unseen || {};
  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { key: "match", label: "Gợi ý" },
          { key: "received", label: "Yêu cầu", dot: u.received > 0 },
          { key: "sent", label: "Đã gửi", dot: u.sent > 0 },
          { key: "accepted", label: "Đã kết nối", dot: u.accepted > 0 },
        ]}
      />
      {tab === "match" ? (
        <MatchList />
      ) : (
        <ConnectionList key={tab} type={tab} onChanged={loadSummary} />
      )}
    </View>
  );
}

/* ---------------- Gợi ý bạn cùng phòng ---------------- */
function MatchList() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState("");
  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);

  // Tìm kiếm tức thì khi người dùng nhập (debounce 300ms)
  useEffect(() => {
    if (text.trim()) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setQ(text.trim());
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const fetchMatches = useCallback(
    async (p: number) => {
      try {
        const res = await listMatchesApi({
          page: p,
          limit: 12,
          location: q || undefined,
        });
        // Nếu có q mà server trả về rỗng (ví dụ do gõ tiếng Việt không dấu),
        // fallback lấy danh sách để client tự lọc không dấu chuẩn xác
        if (q && (!res?.items || res.items.length === 0)) {
          const fallbackRes = await listMatchesApi({ page: p, limit: 12 });
          return fallbackRes;
        }
        return res;
      } catch {
        return listMatchesApi({ page: p, limit: 12 });
      }
    },
    [q],
  );

  const list = useInfiniteList(fetchMatches, [q]);

  const needProfile =
    list.errorCode === "PROFILE_INCOMPLETE" || list.errorCode === "NOT_LOOKING";

  const handleClearFilter = () => {
    setText("");
    setQ("");
    setIsSearching(false);
  };

  // Lọc kết quả theo khu vực người dùng nhập vào
  const displayItems = useMemo(() => {
    const rawItems = list.items || [];
    if (!q) return rawItems;
    const normQ = normalizeVietnamese(q);
    return rawItems.filter((item: any) => {
      const locations = Array.isArray(item.locations) ? item.locations : [];
      const matchLoc = locations.some((loc: string) =>
        normalizeVietnamese(loc).includes(normQ),
      );
      const matchCity = normalizeVietnamese(item.city || "").includes(normQ);
      return matchLoc || matchCity;
    });
  }, [list.items, q]);

  const connect = async (item: any) => {
    setBusyId(item.userId);
    try {
      await sendRequestApi(item.userId);
      setSent((m) => ({ ...m, [item.userId]: true }));
    } catch (err: any) {
      Alert.alert("Không gửi được yêu cầu", errorText(err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View style={s.searchContainer}>
        <View style={s.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color="#64748b"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm theo khu vực (quận, phường)..."
            placeholderTextColor="#64748b"
            value={text}
            onChangeText={setText}
            returnKeyType="search"
          />
          {isSearching && (
            <View style={{ padding: 4 }}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={themeColors.primary}
              />
            </View>
          )}
          {text.length > 0 && !isSearching && (
            <Pressable
              hitSlop={8}
              onPress={handleClearFilter}
              style={{ padding: 4 }}
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {list.loading && !q ? (
        <Loading text="Đang tìm người phù hợp..." />
      ) : (
        <FlatList
          style={{ backgroundColor: themeColors.bg }}
          ref={listRef}
          data={displayItems}
          keyExtractor={(it) => it.userId}
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
            <View
              style={{
                alignItems: "center",
                paddingVertical: 24,
                paddingHorizontal: 16,
              }}
            >
              <Text style={[shared.empty, { textAlign: "center" }]}>
                {needProfile
                  ? `${list.error}\n\nHãy hoàn thiện hồ sơ tìm bạn ở trang web Roomie rồi quay lại đây.`
                  : list.error ||
                    (q
                      ? `Không tìm thấy kết quả phù hợp cho "${q}".`
                      : "Không có hồ sơ nào phù hợp.")}
              </Text>
              {!!q && (
                <Pressable
                  style={s.clearFilterEmptyBtn}
                  onPress={handleClearFilter}
                >
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}
                  >
                    Xóa bộ lọc & Tải lại
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const status = sent[item.userId] ? "sent" : item.relation?.status;
            const sub = [
              item.age && `${item.age} tuổi`,
              (GENDER_LABELS as any)[item.gender],
              item.school || item.occupation,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <View style={s.card}>
                {/* Bấm vào thẻ thông tin để xem hồ sơ chi tiết */}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/profile/[id]",
                      params: {
                        id: String(item.userId),
                        data: JSON.stringify(item),
                      },
                    })
                  }
                  style={{ gap: 10 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <Avatar uri={item.avatarUrl} name={item.displayName} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      {sub ? (
                        <Text style={s.muted} numberOfLines={1}>
                          {sub}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        s.score,
                        {
                          backgroundColor:
                            item.match.score >= 80
                              ? "#10b981"
                              : item.match.score >= 50
                                ? "#d97706"
                                : "#475569",
                        },
                      ]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        {Math.round(item.match.score)}%
                      </Text>
                    </View>
                  </View>
                  {!item.match.compatible && (
                    <Text style={{ color: themeColors.danger, fontSize: 12 }}>
                      Không đạt tiêu chí bắt buộc
                    </Text>
                  )}
                  {item.bio ? (
                    <Text numberOfLines={3} style={{ color: themeColors.text }}>
                      {item.bio}
                    </Text>
                  ) : null}
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    <Chip text={`💰 ${formatBudget(item.budget)}`} />
                    {(item.locations || []).slice(0, 3).map((l: string) => (
                      <Chip key={l} text={`📍 ${l}`} />
                    ))}
                  </View>
                </Pressable>
                {status === "accepted" ? (
                  <View style={[s.primaryButton, s.disabledButton]}>
                    <Text style={s.buttonText}>Đã kết nối</Text>
                  </View>
                ) : status === "sent" ? (
                  <View style={[s.primaryButton, s.disabledButton]}>
                    <Text style={s.buttonText}>Đã gửi yêu cầu</Text>
                  </View>
                ) : status === "received" ? (
                  <Text style={s.state}>
                    Người này muốn kết nối với bạn (xem ở mục Nhận được)
                  </Text>
                ) : (
                  <Pressable
                    style={[
                      s.primaryButton,
                      busyId === item.userId && { opacity: 0.6 },
                    ]}
                    disabled={busyId === item.userId}
                    onPress={() => connect(item)}
                  >
                    <Text style={s.buttonText}>Gửi yêu cầu kết nối</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

/* ---------------- Nhận được / Đã gửi / Đã kết nối ---------------- */
function ConnectionList({
  type,
  onChanged,
}: {
  type: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const { refresh: refreshNotifications } = useNotifications();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await listConnectionsApi(type);
      setItems(data.items);
      setError("");
      if (data.items.some((c: any) => c.unseen)) {
        markSeenApi(type)
          .then(() => {
            refreshNotifications();
            onChanged();
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(errorText(err));
    }
  }, [type, onChanged, refreshNotifications]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const run = async (id: string, fn: () => Promise<any>) => {
    setBusyId(id);
    try {
      await fn();
      await load();
      onChanged();
      refreshNotifications();
    } catch (err: any) {
      Alert.alert("Không thực hiện được", errorText(err));
    } finally {
      setBusyId("");
    }
  };

  const openChat = async (c: any) => {
    setBusyId(c.id);
    try {
      const { conversationId } = await startConversationApi(c.user.userId);
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId, name: c.user.displayName },
      });
    } catch (err: any) {
      Alert.alert("Không mở được cuộc trò chuyện", errorText(err));
    } finally {
      setBusyId("");
    }
  };

  const confirmDisconnect = (c: any) =>
    Alert.alert(
      "Hủy kết nối",
      `Bạn muốn hủy kết nối với ${c.user.displayName}?`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy kết nối",
          style: "destructive",
          onPress: () => run(c.id, () => disconnectApi(c.id)),
        },
      ],
    );

  if (loading) return <Loading text="Đang tải..." />;

  return (
    <FlatList
      style={{ backgroundColor: themeColors.bg }}
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListEmptyComponent={
        <Text style={shared.empty}>{error || "Chưa có mục nào."}</Text>
      }
      renderItem={({ item: c }) => {
        const busy = busyId === c.id;
        const targetUserId = String(
          c.user?.userId || c.user?.id || c.userId || "",
        );
        return (
          <View style={[s.card, busy && { opacity: 0.6 }]}>
            {/* Bấm vào thẻ để xem hồ sơ chi tiết */}
            <Pressable
              onPress={() =>
                targetUserId &&
                router.push({
                  pathname: "/profile/[id]",
                  params: {
                    id: targetUserId,
                    data: JSON.stringify({
                      userId: targetUserId,
                      displayName: c.user?.displayName,
                      avatarUrl: c.user?.avatarUrl,
                      age: c.user?.age,
                      match:
                        c.matchScore != null
                          ? { score: c.matchScore }
                          : undefined,
                      relation: {
                        status:
                          type === "accepted"
                            ? "accepted"
                            : type === "sent"
                              ? "sent"
                              : type === "received"
                                ? "received"
                                : undefined,
                      },
                      message: c.message,
                    }),
                  },
                })
              }
              style={{ gap: 8 }}
            >
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <Avatar uri={c.user?.avatarUrl} name={c.user?.displayName} />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={s.name} numberOfLines={1}>
                      {c.user?.displayName}
                    </Text>
                    {c.unseen && (
                      <View style={s.newBadge}>
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          Mới
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.muted} numberOfLines={1}>
                    {[
                      c.user?.age && `${c.user.age} tuổi`,
                      c.matchScore != null &&
                        `Phù hợp ${Math.round(c.matchScore)}%`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              </View>
              {c.message ? (
                <Text style={{ color: themeColors.text }}>
                  &ldquo;{c.message}&rdquo;
                </Text>
              ) : null}
            </Pressable>

            {type === "received" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={[s.primaryButton, { flex: 1 }]}
                  disabled={busy}
                  onPress={() => run(c.id, () => acceptApi(c.id))}
                >
                  <Text style={s.buttonText}>Chấp nhận</Text>
                </Pressable>
                <Pressable
                  style={[s.outlineButton, { flex: 1 }]}
                  disabled={busy}
                  onPress={() => run(c.id, () => rejectApi(c.id))}
                >
                  <Text style={{ color: themeColors.text, fontWeight: "600" }}>
                    Từ chối
                  </Text>
                </Pressable>
              </View>
            )}
            {type === "sent" &&
              (c.status === "pending" ? (
                <Pressable
                  style={s.outlineButton}
                  disabled={busy}
                  onPress={() => run(c.id, () => cancelApi(c.id))}
                >
                  <Text style={{ color: themeColors.text, fontWeight: "600" }}>
                    Hủy yêu cầu
                  </Text>
                </Pressable>
              ) : (
                <Text style={s.state}>Yêu cầu đã bị từ chối</Text>
              ))}
            {type === "accepted" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={[s.primaryButton, { flex: 1 }]}
                  disabled={busy}
                  onPress={() => openChat(c)}
                >
                  <Text style={s.buttonText}>💬 Nhắn tin</Text>
                </Pressable>
                <Pressable
                  style={[s.outlineButton, { flex: 1 }]}
                  disabled={busy}
                  onPress={() => confirmDisconnect(c)}
                >
                  <Text
                    style={{ color: themeColors.danger, fontWeight: "600" }}
                  >
                    Hủy kết nối
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
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
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: themeColors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: themeColors.primary,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  activeFilterBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  activeFilterText: {
    color: themeColors.muted,
    fontSize: 13,
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  clearFilterBtnText: {
    color: themeColors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  clearFilterEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
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
  card: {
    backgroundColor: themeColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
    gap: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColors.text,
    flexShrink: 1,
  },
  muted: { color: themeColors.muted, fontSize: 13 },
  state: { color: themeColors.primary, fontWeight: "600" },
  buttonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  primaryButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#312e81",
    borderWidth: 1,
    borderColor: themeColors.primary,
    opacity: 0.85,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  newBadge: {
    backgroundColor: themeColors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
