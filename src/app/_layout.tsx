import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../auth/AuthContext";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";
import { NotificationProvider } from "../context/NotificationContext";
import { ThemeProvider } from "../context/ThemeContext";

function AppStack() {
  const { t } = useLanguage();

  const subScreenHeaderOptions = {
    headerShown: true,
    headerTransparent: false,
    headerStyle: { backgroundColor: "#1e293b" },
    headerTintColor: "#f8fafc",
    headerTitleStyle: { color: "#f8fafc", fontWeight: "700" as const },
    headerShadowVisible: false,
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerBackButtonDisplayMode: "minimal",
          ...subScreenHeaderOptions,
          contentStyle: { backgroundColor: "#0f172a" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.login,
          }}
        />
        <Stack.Screen
          name="pass/[id]"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.passDetail,
          }}
        />
        <Stack.Screen
          name="accommodation/[id]"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.accommodationDetail,
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.chat,
          }}
        />
        <Stack.Screen
          name="favorites"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.favorites,
          }}
        />
        <Stack.Screen
          name="profile/[id]"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.profileDetail,
          }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.editProfile,
          }}
        />
        <Stack.Screen
          name="account/subscription"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.subscription,
          }}
        />
        <Stack.Screen
          name="account/support"
          options={{
            ...subScreenHeaderOptions,
            title: t.stack.support,
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppStack />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}