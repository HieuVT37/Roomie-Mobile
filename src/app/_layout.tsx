import { Stack } from "expo-router";
import { AuthProvider } from "../auth/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="index" options={{ title: "Pass đồ và phòng" }} />
        <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
      </Stack>
    </AuthProvider>
  );
}
