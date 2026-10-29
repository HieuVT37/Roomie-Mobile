import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { imageUrl } from "../../api/axios";
import { sendRequestApi } from "../../api/connections";
import { startConversationApi } from "../../api/conversations";
import { getMatchApi } from "../../api/matching";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Loading, useBottomPad } from "../../components/ui";
import {
  CRITERIA_LABELS,
  GENDER_LABELS,
  GUEST_LABELS,
  PATTERN_LABELS,
  SHARED_LABELS,
  formatBudget,
} from "../../utils/labels";

const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
  success: "#10b981",
  warning: "#d97706",
  danger: "#ef4444",
};

const yesNo = (v?: boolean) => (v ? "Có" : "Không");

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={sRow.row}>
      <Text style={sRow.label}>{label}</Text>
      <Text style={sRow.value}>{String(value)}</Text>
    </View>
  );
}

function MatchBar({ label, value }: { label: string; value: number }) {
  const barColor =
    value >= 80
      ? themeColors.success
      : value >= 50
        ? themeColors.warning
        : themeColors.danger;
  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={{ color: themeColors.text, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: barColor, fontWeight: "700", fontSize: 13 }}>
          {Math.round(value)}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: "#334155",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

export default function UserDetailScreen() {
  const { id, data: initialDataParam } = useLocalSearchParams<{
    id: string;
    data?: string;
  }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const bottom = useBottomPad(20);

  // Parse dữ liệu sơ bộ truyền từ trang trước (nếu có)
  const initialData = useMemo(() => {
    if (!initialDataParam) return null;
    try {
      return JSON.parse(initialDataParam);
    } catch {
      return null;
    }
  }, [initialDataParam]);

  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(!initialData);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyAction, setBusyAction] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    getMatchApi(id)
      .then((res) => {
        if (!active) return;
        setDetailData(res);
        setErrorMsg("");
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err.response?.data?.message ||
          "Không thể tải thêm thông tin chi tiết từ máy chủ.";
        setErrorMsg(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Hợp nhất dữ liệu: ưu tiên dữ liệu đầy đủ từ API, fallback sang initialData
  const p = detailData?.profile || initialData || {};
  const match = detailData?.match || initialData?.match;
  const relation = detailData?.relation || initialData?.relation || {};

  const displayName = p.displayName || p.fullName || p.name || "Người dùng";
  const avatarUrl = p.avatarUrl;
  const age = p.age;
  const gender = (GENDER_LABELS as any)[p.gender] || p.gender;
  const school = p.school;
  const occupation = p.occupation;
  const subInfo = [age && `${age} tuổi`, gender, school || occupation]
    .filter(Boolean)
    .join(" · ");

  const bio = p.bio;
  const budget = p.budget;
  const locations: string[] = Array.isArray(p.locations)
    ? p.locations
    : p.location
      ? [p.location]
      : [];
  const city = p.city;
  const sched = p.schedule;
  const l = p.lifestyle || {};
  const roomPhotos: string[] = p.roomPhotos || [];
  const interests: string[] = p.interests || [];
  const requirements: string[] = p.requirements || [];

  const currentStatus = sentSuccess
    ? "sent"
    : relation?.status || (initialData?.relation?.status ?? "none");

  const isOwnProfile =
    currentUser &&
    (String(currentUser.id) === String(id) ||
      String(currentUser._id) === String(id));

  // Gửi kết nối
  const handleConnect = async () => {
    setBusyAction(true);
    try {
      await sendRequestApi(id);
      setSentSuccess(true);
      Alert.alert("Thành công", "Đã gửi yêu cầu kết nối!");
    } catch (err: any) {
      Alert.alert(
        "Không gửi được yêu cầu",
        err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.",
      );
    } finally {
      setBusyAction(false);
    }
  };

  // Mở đoạn chat
  const handleOpenChat = async () => {
    setBusyAction(true);
    try {
      const { conversationId } = await startConversationApi(id);
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId, name: displayName },
      });
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể mở cuộc trò chuyện.",
      );
    } finally {
      setBusyAction(false);
    }
  };

  if (loading) {
    return <Loading text="Đang tải thông tin hồ sơ..." />;
  }

  if (!p || (!p.displayName && !p.userId && errorMsg)) {
    return (
      <View style={s.center}>
        <Stack.Screen
          options={{
            title: "Hồ sơ cá nhân",
            headerStyle: { backgroundColor: themeColors.card },
            headerTintColor: themeColors.text,
          }}
        />
        <Text style={s.errorText}>{errorMsg || "Không tìm thấy hồ sơ"}</Text>
        <Pressable style={s.primaryButton} onPress={() => router.back()}>
          <Text style={s.buttonText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: bottom + 40 }}
    >
      <Stack.Screen
        options={{
          title: displayName,
          headerStyle: { backgroundColor: themeColors.card },
          headerTintColor: themeColors.text,
          headerShadowVisible: false,
        }}
      />

      {/* Thông báo nếu có lỗi quota hoặc lưu ý */}
      {errorMsg && initialData ? (
        <View style={s.noticeCard}>
          <Text style={s.noticeText}>ℹ️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Header Avatar & Tên */}
      <View style={s.card}>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Avatar uri={avatarUrl} name={displayName} size={70} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{displayName}</Text>
            {subInfo ? <Text style={s.muted}>{subInfo}</Text> : null}
          </View>
          {match?.score != null ? (
            <View
              style={[
                s.scoreBadge,
                {
                  backgroundColor:
                    match.score >= 80
                      ? themeColors.success
                      : match.score >= 50
                        ? themeColors.warning
                        : "#475569",
                },
              ]}
            >
              <Text style={s.scoreText}>{Math.round(match.score)}%</Text>
              <Text style={{ color: "#fff", fontSize: 10 }}>Phù hợp</Text>
            </View>
          ) : null}
        </View>

        {/* Tiêu chí bắt buộc không đạt */}
        {match?.failedDealBreakers && match.failedDealBreakers.length > 0 ? (
          <View style={s.warningBox}>
            <Text style={s.warningText}>
              ⚠️ Không đạt tiêu chí bắt buộc:{" "}
              {match.failedDealBreakers
                .map((k: string) => (CRITERIA_LABELS as any)[k] || k)
                .join(", ")}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Giới thiệu bản thân */}
      {bio ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Giới thiệu bản thân</Text>
          <Text style={s.bioText}>{bio}</Text>
        </View>
      ) : null}

      {/* Tiêu chí & Mức độ tương thích chi tiết */}
      {match?.breakdown && Object.keys(match.breakdown).length > 0 ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Mức độ tương thích chi tiết</Text>
          <View style={{ marginTop: 10 }}>
            {Object.entries(match.breakdown).map(([k, val]: any) => (
              <MatchBar
                key={k}
                label={(CRITERIA_LABELS as any)[k] || k}
                value={Number(val)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Nhu cầu tìm phòng & Thông tin sống chung */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Thông tin sống chung</Text>
        <View style={{ marginTop: 6 }}>
          <InfoRow label="Thành phố" value={city} />
          <InfoRow
            label="Khu vực mong muốn"
            value={locations.length ? locations.join(", ") : null}
          />
          <InfoRow
            label="Ngân sách"
            value={budget ? formatBudget(budget) : null}
          />

          {/* Lịch sinh hoạt */}
          {sched ? (
            <InfoRow
              label="Lịch sinh hoạt"
              value={`Ngủ ${sched.sleepTime || "—"} · Dậy ${sched.wakeTime || "—"} (${(PATTERN_LABELS as any)[sched.pattern] || "Tự do"})`}
            />
          ) : null}

          {/* Lối sống */}
          {l.cleanliness != null ? (
            <InfoRow
              label="Sạch sẽ, ngăn nắp"
              value={`${l.cleanliness}/5 điểm`}
            />
          ) : null}
          {l.noiseLevel != null ? (
            <InfoRow
              label="Mức độ ồn chấp nhận"
              value={`${l.noiseLevel}/5 điểm`}
            />
          ) : null}
          {l.privacyNeed != null ? (
            <InfoRow label="Nhu cầu riêng tư" value={`${l.privacyNeed}/5 điểm`} />
          ) : null}
          {l.guestFrequency ? (
            <InfoRow
              label="Tiếp khách qua đêm"
              value={(GUEST_LABELS as any)[l.guestFrequency] || l.guestFrequency}
            />
          ) : null}
          {l.sharedSpaceUsage ? (
            <InfoRow
              label="Dùng không gian chung"
              value={
                (SHARED_LABELS as any)[l.sharedSpaceUsage] || l.sharedSpaceUsage
              }
            />
          ) : null}
          {l.smoking != null ? (
            <InfoRow label="Hút thuốc" value={yesNo(l.smoking)} />
          ) : null}
          {l.pets != null ? (
            <InfoRow label="Thú cưng" value={yesNo(l.pets)} />
          ) : null}

          {interests.length ? (
            <InfoRow label="Sở thích" value={interests.join(", ")} />
          ) : null}
          {requirements.length ? (
            <InfoRow
              label="Yêu cầu khi sống chung"
              value={requirements.join(", ")}
            />
          ) : null}
        </View>
      </View>

      {/* Ảnh phòng đang ở (nếu có) */}
      {roomPhotos.length > 0 ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Hình ảnh phòng đang ở</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, marginTop: 10 }}
          >
            {roomPhotos.map((photo, i) => (
              <Image
                key={i}
                source={{ uri: imageUrl(photo) as string }}
                style={s.roomPhoto}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Nút hành động */}
      {!isOwnProfile && (
        <View style={{ marginTop: 12, paddingHorizontal: 12 }}>
          {currentStatus === "accepted" ? (
            <Pressable
              style={[s.primaryButton, busyAction && { opacity: 0.6 }]}
              disabled={busyAction}
              onPress={handleOpenChat}
            >
              <Text style={s.buttonText}>💬 Nhắn tin ngay</Text>
            </Pressable>
          ) : currentStatus === "sent" ? (
            <View style={s.statusBadge}>
              <Text style={{ color: themeColors.primary, fontWeight: "600" }}>
                ✓ Đã gửi yêu cầu kết nối
              </Text>
            </View>
          ) : currentStatus === "received" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[s.primaryButton, { flex: 1 }]}
                disabled={busyAction}
                onPress={handleConnect}
              >
                <Text style={s.buttonText}>Chấp nhận kết nối</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[s.primaryButton, busyAction && { opacity: 0.6 }]}
              disabled={busyAction}
              onPress={handleConnect}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={s.buttonText}>Gửi yêu cầu kết nối</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const sRow = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: themeColors.muted,
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColors.text,
    textAlign: "right",
    flex: 1,
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.bg },
  center: {
    flex: 1,
    backgroundColor: themeColors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: themeColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
  },
  noticeCard: {
    backgroundColor: "#1e1b4b",
    borderColor: themeColors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 12,
  },
  noticeText: {
    color: "#a5b4fc",
    fontSize: 13,
  },
  name: {
    fontSize: 19,
    fontWeight: "700",
    color: themeColors.text,
  },
  muted: {
    color: themeColors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  scoreBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  scoreText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  warningBox: {
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: themeColors.danger,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  warningText: {
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColors.text,
  },
  bioText: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 22,
    marginTop: 8,
  },
  roomPhoto: {
    width: 140,
    height: 100,
    borderRadius: 10,
    backgroundColor: themeColors.border,
  },
  primaryButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  statusBadge: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  errorText: {
    color: themeColors.danger,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
});
