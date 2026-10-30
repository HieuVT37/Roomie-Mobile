import { Tabs } from "expo-router";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { AIChatButton } from "../../components/AIChat";
import { useNotifications } from "../../context/NotificationContext";
import { useLanguage } from "../../context/LanguageContext";

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

export default function TabsLayout() {
  const unread = useNotifications();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <Tabs
      //@ts-ignore
      initialRouteName="connections"
      screenOptions={{
        // Gộp chung cả nút chuyển ngôn ngữ và nút AI Chat ở đây để không bị trùng lặp
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable style={s.langBtn} onPress={toggleLanguage}>
              <Text style={s.langText}>
                {language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
              </Text>
            </Pressable>
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
          tabBarBadgeStyle: {
            backgroundColor: themeColors.primary,
            color: "#fff",
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.tabs.messages,
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
        options={{ title: t.tabs.account, tabBarIcon: icon("👤") }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  langBtn: {
    marginRight: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#312e81",
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  langText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
});