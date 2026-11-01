import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { registerApi } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { KeyboardScreen } from "../components/ui";
export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (displayName.trim().length < 2)
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return Alert.alert("Email không hợp lệ", "Vui lòng kiểm tra lại email.");
    if (password.length < 6)
      return Alert.alert("Mật khẩu yếu", "Mật khẩu cần ít nhất 6 ký tự.");
    if (password !== confirm)
      return Alert.alert("Không khớp", "Mật khẩu nhập lại không giống nhau.");
    setBusy(true);
    try {
      await registerApi({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      try {
        await login(email.trim(), password); // tự đăng nhập sau khi đăng ký
        router.replace("/(tabs)/connections");
      } catch {
        Alert.alert("Đăng ký thành công", "Hãy đăng nhập để tiếp tục.");
        router.replace("/login");
      }
    } catch (err) {
      Alert.alert(
        "Đăng ký thất bại",
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          "Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardScreen>
      <Stack.Screen options={{ title: "Đăng ký" }} />
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.logo}>Tạo tài khoản</Text>

        <TextInput
          style={s.input}
          placeholder="Họ và tên"
          placeholderTextColor="#64748b"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={s.input}
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <Pressable
          style={[s.button, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={submit}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Đăng ký</Text>
          )}
        </Pressable>

        <Pressable hitSlop={8} onPress={() => router.replace("/login")}>
          <Text style={s.link}>Đã có tài khoản? Đăng nhập</Text>
        </Pressable>
      </ScrollView>
    </KeyboardScreen>
  );
}
const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 14 },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#6366f1",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f8fafc",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  link: {
    color: "#818cf8",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
});
