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
import { checkoutApi, simulatePaymentApi } from "../../api/billing";
import { useAuth } from "../../auth/AuthContext";

// Phương thức thanh toán gửi lên server. Phải trùng với giá trị hợp lệ trong
// models/Payment.js (hoặc validator của route /billing/checkout).
const PAYMENT_METHOD = "momo";

// Cấu hình thứ tự cấp độ cho từng gói
const PLAN_LEVELS: Record<string, number> = {
  basic: 0,
  plus: 1,
  pro: 2,
};

const userKey = (user: any) =>
  String(user?.id ?? user?._id ?? user?.email ?? "");

// Dữ liệu gói hiển thị, không thay đổi theo render hay phiên đăng nhập.
const PLANS = [
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
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const activeUser = useRef(user);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    activeUser.current = user;
  }, [user]);

  // Cấp độ gói hiện tại của người dùng (mặc định là basic = 0)
  const currentPlanKey =
    typeof user?.currentPlan === "string"
      ? user.currentPlan.trim().toLowerCase()
      : "basic";
  const currentLevel = PLAN_LEVELS[currentPlanKey] ?? 0;

  // Thanh toán: tạo giao dịch -> giả lập thanh toán thành công -> làm mới phiên
  const processPayment = async (planKey: string, expectedUser: string) => {
    const sameUser = () =>
      Boolean(expectedUser) && userKey(activeUser.current) === expectedUser;

    if (submitting.current || !mounted.current || !sameUser()) return;
    submitting.current = true;
    setSubmittingPlan(planKey);

    try {
      // Bước 1: tạo giao dịch ở trạng thái pending
      const { payment } = await checkoutApi(planKey, PAYMENT_METHOD);

      // Bước 2: xác nhận thanh toán (server cần PAYMENT_MODE=mock trong .env)
      await simulatePaymentApi(payment.id, "success");

      if (!mounted.current || !sameUser()) return;

      // Bước 3: làm mới thông tin tài khoản để nhận gói mới
      try {
        await refreshSession({ force: true });
        if (!mounted.current) return;
        Alert.alert(
          "Thành công",
          `Đã kích hoạt gói ${planKey.toUpperCase()} cho tài khoản của bạn.`,
        );
      } catch {
        if (!mounted.current) return;
        Alert.alert(
          "Đã thanh toán",
          "Gói đã được kích hoạt nhưng chưa thể làm mới thông tin tài khoản. Hãy đăng nhập lại hoặc kéo để tải lại.",
        );
      }
    } catch (error: any) {
      if (mounted.current && sameUser()) {
        Alert.alert(
          "Không thanh toán được",
          typeof error?.response?.data?.message === "string"
            ? error.response.data.message
            : "Chưa thể xử lý thanh toán. Vui lòng thử lại.",
        );
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSubmittingPlan(null);
    }
  };

  // Xử lý khi nhấn nút Đăng ký / Gia hạn / Nâng cấp
  const handleSelectPlan = (planKey: string) => {
    if (submitting.current) return;
    if (!user) {
      Alert.alert(
        "Cần đăng nhập",
        "Vui lòng đăng nhập để đăng ký gói dịch vụ.",
      );
      return;
    }
    const targetLevel = PLAN_LEVELS[planKey] ?? 0;

    // Chọn gói thấp hơn gói đang dùng
    if (targetLevel < currentLevel) {
      Alert.alert(
        "Không thể thực hiện",
        "Bạn đang sử dụng gói dịch vụ cao hơn, không thể đăng ký gói dịch vụ thấp hơn.",
      );
      return;
    }

    // Gói Basic (miễn phí)
    if (planKey === "basic") return;

    // Gia hạn hoặc nâng cấp
    const isRenew = planKey === currentPlanKey;
    const actionText = isRenew ? "gia hạn thêm 30 ngày cho" : "nâng cấp lên";
    const expectedUser = userKey(user);

    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn ${actionText} gói ${planKey.toUpperCase()}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thanh toán",
          onPress: () => processPayment(planKey, expectedUser),
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

      {PLANS.map((plan) => {
        const targetLevel = PLAN_LEVELS[plan.key] ?? 0;
        const isCurrent = plan.key === currentPlanKey;
        const isLowerPlan = targetLevel < currentLevel;

        // Xác định nhãn hiển thị cho nút
        let buttonText = "Nâng cấp";
        if (isCurrent) {
          buttonText =
            plan.key === "basic" ? "Gói miễn phí" : "Gia hạn thêm 30 ngày";
        } else if (isLowerPlan) {
          buttonText = "Không thể đăng ký";
        }

        const btnDisabled =
          !user ||
          submittingPlan !== null ||
          isLowerPlan ||
          (isCurrent && plan.key === "basic");

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
              {plan.features.map((f, idx) => (
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
                btnDisabled && styles.disabledBtn,
                !isLowerPlan &&
                  (plan.highlight || plan.key === "pro" || isCurrent) &&
                  styles.activeBtn,
              ]}
              disabled={btnDisabled}
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
      })}

      <Text style={styles.footerNote}>
        Đăng tin cho thuê phòng còn yêu cầu tài khoản được cấp quyền chủ trọ.
        Gói và quyền có hiệu lực theo kết quả được máy chủ xác nhận.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
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
