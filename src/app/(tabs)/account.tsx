import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Loading, LoginPrompt } from "../../components/ui";
import { useLanguage } from "../../context/LanguageContext";
import { PLAN_LABELS } from "../../utils/labels";

export default function AccountScreen() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  const { t } = useLanguage();

  if (loading) return <Loading text={t.common.checkingAuth} />;
  if (!user) return <LoginPrompt text={t.account.loginPrompt} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar & Tên người dùng */}
      <View style={{ alignItems: "center", gap: 10 }}>
        <Avatar
          uri={profile?.avatarUrl}
          name={profile?.displayName || user.email}
          size={88}
        />
        <Text style={styles.userName}>
          {profile?.displayName || user.email}
        </Text>
      </View>

      {/* Thẻ thông tin tài khoản */}
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.account.email}</Text>
          <Text style={styles.rowValue}>{user.email}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.account.plan}</Text>
          <Text style={[styles.rowValue, styles.highlightValue]}>
            {(PLAN_LABELS as any)[user.currentPlan] ||
              user.currentPlan ||
              "Basic"}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.account.landlordRole}</Text>
          <Text style={styles.rowValue}>
            {user.isLandlord ? t.account.hasLandlord : t.account.noLandlord}
          </Text>
        </View>
      </View>

      {/* Danh sách các nút chức năng */}
      <View style={{ gap: 12 }}>
        {/* Chỉnh sửa hồ sơ */}
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/profile/edit" as any)}
        >
          <Text style={styles.menuText}>{t.account.editProfile}</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Gói dịch vụ */}
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/account/subscription" as any)}
        >
          <Text style={styles.menuText}>{t.account.subscription}</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Tin đã lưu */}
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/favorites" as any)}
        >
          <Text style={styles.menuText}>{t.account.savedPosts}</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Hỗ trợ */}
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/account/support" as any)}
        >
          <Text style={styles.menuText}>{t.account.supportCenter}</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      {/* Nút Đăng xuất */}
      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t.account.logout}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 30,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f8fafc",
  },
  infoCard: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  highlightValue: {
    color: "#6366f1",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
  },
  menuText: {
    fontSize: 16,
    color: "#f8fafc",
    fontWeight: "500",
  },
  arrow: {
    color: "#64748b",
    fontSize: 18,
  },
  logoutBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  logoutText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
