import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { KeyboardScreen, useBottomPad } from "../components/ui";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen)
const themeColors = {
  bg: "#0f172a", // Nền xanh đen tối
  card: "#1e293b", // Nền ô input
  border: "#334155", // Viền
  text: "#f8fafc", // Chữ chính sáng
  muted: "#94a3b8", // Chữ phụ xám
  placeholder: "#64748b", // Chữ gợi ý trong input
  primary: "#6366f1", // Tím nhấn
  danger: "#ef4444", // Đỏ báo lỗi
};

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useBottomPad(20);

  const submit = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Quay lại màn trước đó nếu có, không thì về trang chủ
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (err: any) {
      setError(
        err.code === "ECONNABORTED"
          ? "Máy chủ đang khởi động, vui lòng thử lại sau ít phút"
          : err.response?.data?.message ||
              err.message ||
              "Không đăng nhập được",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.container, { paddingBottom: bottom }]}
      >
        <Text style={s.title}>Roomie</Text>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={themeColors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Mật khẩu"
          placeholderTextColor={themeColors.placeholder}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable
          style={[s.button, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>
        <Text style={s.hint}>
          Chưa có tài khoản? Đăng ký trên trang web Roomie.
        </Text>
      </ScrollView>
    </KeyboardScreen>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 12,
    justifyContent: "center",
    backgroundColor: themeColors.bg,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: themeColors.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: themeColors.text,
  },
  error: { color: themeColors.danger, textAlign: "center" },
  button: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: {
    color: themeColors.muted,
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
});
