import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { KeyboardScreen, colors, useBottomPad } from "../components/ui";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useBottomPad(20);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/");
    } catch (err: any) {
      setError(
        err.code === "ECONNABORTED"
          ? "Máy chủ đang khởi động, vui lòng thử lại sau ít phút"
          : err.response?.data?.message || err.message || "Không đăng nhập được"
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
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable style={[s.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Đăng nhập</Text>}
        </Pressable>
        <Text style={s.hint}>Chưa có tài khoản? Đăng ký trên trang web Roomie.</Text>
      </ScrollView>
    </KeyboardScreen>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 12, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: colors.primary, textAlign: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, padding: 12, fontSize: 16 },
  error: { color: colors.danger },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  hint: { color: colors.muted, textAlign: "center", marginTop: 8 },
});
