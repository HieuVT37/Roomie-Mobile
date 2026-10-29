import { Tabs } from "expo-router";
import { Text } from "react-native";
import { AIChatButton } from "../../components/AIChat";
import { useNotifications } from "../../context/NotificationContext";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen)
const themeColors = {
  bg: "#0f172a", // Nền chính
  card: "#1e293b", // Nền Header & TabBar
  border: "#334155", // Viền
  text: "#f8fafc", // Chữ chính sáng
  muted: "#94a3b8", // Chữ/Icon phụ
  primary: "#6366f1", // Tím điểm nhấn
};

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return (
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
    );
  };

export default function TabsLayout() {
  const unread = useNotifications();
  return (
    <Tabs
      //@ts-ignore
      initialRouteName="connections"
      screenOptions={{
        headerRight: () => <AIChatButton />,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.muted,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: themeColors.card,
        },
        headerTitleStyle: {
          color: themeColors.text,
          fontWeight: "700",
        },
        headerTintColor: themeColors.text,
        headerTitleAlign: "center",
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Tìm phòng", tabBarIcon: icon("🏠") }}
      />
      <Tabs.Screen
        name="pass"
        options={{ title: "Pass", tabBarIcon: icon("📦") }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: "Kết nối",
          tabBarIcon: icon("🤝"),
          tabBarBadge: unread.connections > 0 ? unread.connections : undefined,
          tabBarBadgeStyle: {
            backgroundColor: themeColors.primary,
            color: "#fff",
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Tin nhắn",
          tabBarIcon: icon("💬"),
          tabBarBadge: unread.messages > 0 ? unread.messages : undefined,
          tabBarBadgeStyle: {
            backgroundColor: themeColors.primary,
            color: "#fff",
          },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Tài khoản", tabBarIcon: icon("👤") }}
      />
    </Tabs>
  );
}
