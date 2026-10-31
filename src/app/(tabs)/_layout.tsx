import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { AIChatButton } from "../../components/AIChat";
import { useLanguage } from "../../context/LanguageContext";
import { useNotifications } from "../../context/NotificationContext";

// Mặc định mở tab "Kết nối" khi vào (tabs)
export const unstable_settings = {
  initialRouteName: "connections",
};

const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
};

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return (
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
    );
  };

const badgeStyle = {
  backgroundColor: themeColors.primary,
  color: "#fff",
};

export default function TabsLayout() {
  const unread = useNotifications();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AIChatButton />
          </View>
        ),
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
        options={{ title: t.tabs.home, tabBarIcon: icon("🏠") }}
      />
      <Tabs.Screen
        name="pass"
        options={{ title: t.tabs.pass, tabBarIcon: icon("📦") }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: t.tabs.connections,
          tabBarIcon: icon("🤝"),
          tabBarBadge: unread.connections > 0 ? unread.connections : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.messages,
          tabBarIcon: icon("💬"),
          tabBarBadge: unread.messages > 0 ? unread.messages : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t.tabs.account, tabBarIcon: icon("👤") }}
      />
    </Tabs>
  );
}
