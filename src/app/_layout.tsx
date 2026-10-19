import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../auth/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "Đăng nhập" }} />
          <Stack.Screen name="pass/[id]" options={{ title: "Chi tiết Pass" }} />
          <Stack.Screen
            name="accommodation/[id]"
            options={{ title: "Chi tiết phòng" }}
          />
          <Stack.Screen name="chat/[id]" options={{ title: "Tin nhắn" }} />
          <Stack.Screen name="favorites" options={{ title: "Yêu thích" }} />

          {/* Các route mới bổ sung */}
          <Stack.Screen
            name="profile/[id]"
            options={{ title: "Hồ sơ cá nhân" }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{ title: "Chỉnh sửa hồ sơ" }}
          />
          <Stack.Screen
            name="account/subscription"
            options={{ title: "Gói dịch vụ" }}
          />
          <Stack.Screen
            name="account/support"
            options={{ title: "Trung tâm hỗ trợ" }}
          />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}
