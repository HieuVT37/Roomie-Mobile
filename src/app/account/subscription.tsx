import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

// Cấu hình thứ tự cấp độ cho từng gói
const PLAN_LEVELS: Record<string, number> = {
  basic: 0,
  plus: 1,
  pro: 2,
};

const userKey = (user: any) => String(user?.id ?? user?._id ?? user?.email ?? "");

// Dữ liệu gói mặc định, không thay đổi theo render hay phiên đăng nhập.
const DEFAULT_PLANS = [
    {
      key: "basic",
      name: "Basic",
      priceText: "Miễn phí",
      subText: "Miễn phí cho người dùng mới",
      features: [
        { label: "Yêu cầu kết nối mỗi tháng", value: "5" },
        { label: "Hồ sơ xem chi tiết mỗi ngày", value: "10" },
        { label: "Bài Pass đang đăng", value: "3" },
        { label: "Đăng tin cho thuê phòng", value: "Không" },
      ],
    },
    {
      key: "plus",
      name: "Plus",
      priceText: "39.000đ",
      period: "/30 ngày",
      subText: "Dành cho người tìm bạn cùng phòng thường xuyên",
      features: [
        { label: "Yêu cầu kết nối mỗi tháng", value: "30" },
        { label: "Hồ sơ xem chi tiết mỗi ngày", value: "50" },
        { label: "Bài Pass đang đăng", value: "10" },
        { label: "Đăng tin cho thuê phòng", value: "Tối đa 3 tin" },
      ],
      highlight: true,
    },
    {
      key: "pro",
      name: "Pro",
      priceText: "99.000đ",
      period: "/30 ngày",
      subText: "Dành cho người dùng thường xuyên và chủ trọ chuyên nghiệp",
      features: [
        { label: "Yêu cầu kết nối mỗi tháng", value: "200" },
        { label: "Hồ sơ xem chi tiết mỗi ngày", value: "500" },
        { label: "Bài Pass đang đăng", value: "30" },
        { label: "Đăng tin cho thuê phòng", value: "Tối đa 20 tin" },
      ],
    },
];

export default function SubscriptionScreen() {
  const { user, refreshSession } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const activeUser = useRef(user);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { activeUser.current = user; }, [user]);

  // Cấp độ gói hiện tại của người dùng (mặc định là basic = 0)
  const currentPlanKey = typeof user?.currentPlan === "string" ? user.currentPlan.trim().toLowerCase() : "basic";
  const currentLevel = PLAN_LEVELS[currentPlanKey] ?? 0;

  useEffect(() => {
    // Gọi API lấy thông tin gói từ Backend
    api
      .get("/subscriptions/plans")
      .then((res: any) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setPlans(res.data);
        } else {
          setPlans(DEFAULT_PLANS);
        }
      })
      .catch(() => setPlans(DEFAULT_PLANS))
      .finally(() => setLoading(false));
  }, [user]);

  // Xử lý khi nhấn nút Đăng ký / Gia hạn / Nâng cấp
  const handleSelectPlan = (planKey: string) => {
    if (submitting.current) return;
    if (!user) {
      Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để gửi yêu cầu gói dịch vụ.");
      return;
    }
    const targetLevel = PLAN_LEVELS[planKey] ?? 0;

    // Trường hợp 1: Chọn gói thấp hơn gói đang dùng
    if (targetLevel < currentLevel) {
      Alert.alert(
        "Không thể thực hiện",
        "Bạn đang sử dụng gói dịch vụ cao hơn, không thể đăng ký gói dịch vụ thấp hơn.",
      );
      return;
    }

    // Trường hợp 2: Gói Basic (miễn phí)
    if (planKey === "basic") return;

    // Trường hợp 3: Gia hạn hoặc Nâng cấp
    const isRenew = planKey === currentPlanKey;
    const actionText = isRenew ? "gia hạn thêm 30 ngày cho" : "nâng cấp lên";
    const expectedUser = userKey(user);
    const sameUser = () => Boolean(expectedUser) && userKey(activeUser.current) === expectedUser;

    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn ${actionText} gói ${planKey.toUpperCase()}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thanh toán",
          onPress: async () => {
            if (submitting.current || !mounted.current || !sameUser()) return;
            submitting.current = true;
            setSubmittingPlan(planKey);
            try {
              await api.post("/subscriptions/subscribe", { plan: planKey });
              if (!mounted.current || !sameUser()) return;
              try {
                const session = await refreshSession({ force: true });
                if (!mounted.current || (!sameUser() && activeUser.current)) return;
                if (!session?.user) {
                  Alert.alert(
                    "Yêu cầu đã được tiếp nhận",
                    "Máy chủ đã tiếp nhận yêu cầu gói dịch vụ. Phiên đăng nhập đã thay đổi; vui lòng đăng nhập lại để kiểm tra kết quả.",
                  );
                  return;
                }
                if (userKey(session.user) !== expectedUser) return;
                Alert.alert(
                  "Yêu cầu đã được tiếp nhận",
                  "Máy chủ đã tiếp nhận yêu cầu gói dịch vụ. Thông tin tài khoản đã được làm mới từ máy chủ.",
                );
              } catch {
                if (!mounted.current || (!sameUser() && activeUser.current)) return;
                Alert.alert(
                  "Yêu cầu đã được tiếp nhận",
                  "Máy chủ đã tiếp nhận yêu cầu, nhưng chưa thể làm mới thông tin tài khoản. Vui lòng kiểm tra lại trước khi gửi yêu cầu khác.",
                );
              }
            } catch (error: any) {
              if (mounted.current && sameUser()) {
                Alert.alert(
                  "Không gửi được yêu cầu",
                  typeof error?.response?.data?.message === "string"
                    ? error.response.data.message
                    : "Chưa thể gửi yêu cầu gói dịch vụ. Vui lòng thử lại.",
                );
              }
            } finally {
              submitting.current = false;
              if (mounted.current) setSubmittingPlan(null);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Stack.Screen options={{ title: "Gói dịch vụ" }} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#6366f1"
          style={{ marginTop: 20 }}
        />
      ) : (
        plans.map((plan) => {
          const targetLevel = PLAN_LEVELS[plan.key] ?? 0;
          const isCurrent = plan.key === currentPlanKey;
          const isLowerPlan = targetLevel < currentLevel;

          // Xác định nhãn hiển thị cho Nút
          let buttonText = "Nâng cấp";
          if (isCurrent) {
            buttonText =
              plan.key === "basic" ? "Gói miễn phí" : "Gia hạn thêm 30 ngày";
          } else if (isLowerPlan) {
            buttonText = "Không thể đăng ký";
          }

          return (
            <View
              key={plan.key}
              style={[
                styles.card,
                plan.highlight && styles.highlightCard,
                isCurrent && styles.currentCard,
              ]}
            >
              {/* Header gói */}
              <View style={styles.cardHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {isCurrent && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Đang dùng</Text>
                  </View>
                )}
              </View>

              {/* Giá gói */}
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>{plan.priceText}</Text>
                {plan.period && (
                  <Text style={styles.periodText}>{plan.period}</Text>
                )}
              </View>
              <Text style={styles.subText}>{plan.subText}</Text>

              {/* Danh sách tính năng */}
              <View style={styles.featureList}>
                {plan.features?.map((f: any, idx: number) => (
                  <View key={idx} style={styles.featureRow}>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <Text style={styles.featureValue}>{f.value}</Text>
                  </View>
                ))}
              </View>

              {/* Nút hành động */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  (!user || submittingPlan !== null || isLowerPlan || (isCurrent && plan.key === "basic")) &&
                    styles.disabledBtn,
                  !isLowerPlan &&
                    (plan.highlight || plan.key === "pro" || isCurrent) &&
                    styles.activeBtn,
                ]}
                disabled={
                  !user ||
                  submittingPlan !== null ||
                  isLowerPlan ||
                  (isCurrent && plan.key === "basic")
                }
                onPress={() => handleSelectPlan(plan.key)}
              >
                {submittingPlan === plan.key ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.actionBtnText,
                      isLowerPlan && styles.disabledBtnText,
                    ]}
                  >
                    {buttonText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <Text style={styles.footerNote}>
        Đăng tin cho thuê phòng còn yêu cầu tài khoản được cấp quyền chủ trọ.
        Gói và quyền có hiệu lực theo kết quả được máy chủ xác nhận.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
    marginTop: 8,
  },
  headerSub: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 18,
    marginBottom: 16,
  },
  highlightCard: { borderColor: "#6366f1", borderWidth: 2 },
  currentCard: { borderColor: "#6366f1" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: { fontSize: 20, fontWeight: "700", color: "#f8fafc" },
  badge: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 10 },
  priceText: { fontSize: 28, fontWeight: "800", color: "#6366f1" },
  periodText: { fontSize: 13, color: "#94a3b8", marginLeft: 4 },
  subText: { fontSize: 13, color: "#94a3b8", marginTop: 4, marginBottom: 16 },
  featureList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 14,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureLabel: { fontSize: 13, color: "#cbd5e1" },
  featureValue: { fontSize: 13, fontWeight: "700", color: "#f8fafc" },
  actionBtn: {
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activeBtn: { backgroundColor: "#4f46e5" },
  disabledBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    opacity: 0.6,
  },
  actionBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  disabledBtnText: { color: "#64748b" },
  footerNote: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
});
