import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../auth/AuthContext";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";
import { NotificationProvider } from "../context/NotificationContext";

function AppStack() {
  const { t } = useLanguage();
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: t.stack.login }} />
        <Stack.Screen name="pass/[id]" options={{ title: t.stack.passDetail }} />
        <Stack.Screen
          name="accommodation/[id]"
          options={{ title: t.stack.accommodationDetail }}
        />
        <Stack.Screen name="chat/[id]" options={{ title: t.stack.chat }} />
        <Stack.Screen name="favorites" options={{ title: t.stack.favorites }} />
        <Stack.Screen
          name="profile/[id]"
          options={{ title: t.stack.profileDetail }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{ title: t.stack.editProfile }}
        />
        <Stack.Screen
          name="account/subscription"
          options={{ title: t.stack.subscription }}
        />
        <Stack.Screen
          name="account/support"
          options={{ title: t.stack.support }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppStack />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
