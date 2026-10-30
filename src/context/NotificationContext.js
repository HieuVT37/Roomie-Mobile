import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import { listConversationsApi } from "../api/conversations";
import { notificationsApi, registerPushTokenApi } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";

// Cấu hình hiển thị thông báo hệ thống trên cả iOS & Android
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const NotificationContext = createContext(
  /** @type {any} */ ({
    messages: 0,
    connections: 0,
    expoPushToken: null,
    refresh: () => {},
  }),
);

const POLL_MS = 10000;

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState({ messages: 0, connections: 0 });
  const [expoPushToken, setExpoPushToken] = useState(null);

  const prevMessagesCountRef = useRef(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  const enabled = Boolean(user) && user.role !== "admin";

  // 1. Xin quyền & Lấy Push Token (Expo Push Token / FCM) gửi lên Backend để nhận Push khi tắt app
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return undefined;

    let active = true;

    async function registerForPushNotificationsAsync() {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("messages", {
            name: "Tin nhắn mới / New Messages",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#6366f1",
            sound: "default",
          });
        }

        if (!Device.isDevice) return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = tokenResponse?.data;

        if (active && token) {
          setExpoPushToken(token);
          Alert.alert("Push token", token);
          console.log("EXPO_PUSH_TOKEN", token);
          await registerPushTokenApi(token, Platform.OS).catch(() => {});
        }
      } catch (err) {
        console.log("Push registration info:", err?.message || err);
      }
    }

    registerForPushNotificationsAsync();

    // Lắng nghe khi có Push Notification từ FCM/Expo gửi về máy
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      refresh();
    });

    // Lắng nghe khi người dùng nhấn vào thông báo trên thanh trạng thái -> Mở thẳng màn hình Chat
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data.conversationId) {
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: String(data.conversationId),
            name: data.senderName || "Tin nhắn",
          },
        });
      } else {
        router.push("/(tabs)/messages");
      }
    });

    return () => {
      active = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [enabled, router]);

  // 2. Hàm làm mới số thông báo + Phát thông báo đẩy trên thiết bị nếu có tin nhắn mới đến
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await notificationsApi();
      const newMessages = res.messages || 0;
      const newConnections = res.connections || 0;

      // Nếu phát hiện số tin nhắn chưa đọc tăng lên -> Bắn thông báo hệ thống kèm nội dung tin nhắn mới nhất
      if (
        Platform.OS !== "web" &&
        prevMessagesCountRef.current !== null &&
        newMessages > prevMessagesCountRef.current
      ) {
        try {
          const convData = await listConversationsApi();
          const latestUnread = convData?.items?.find((c) => c.unread > 0) || convData?.items?.[0];
          const senderName = latestUnread?.other?.displayName || "Roomie";
          const bodyText = latestUnread?.lastMessage?.text || "Bạn có tin nhắn mới!";
          const convId = latestUnread?.id;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `💬 ${senderName}`,
              body: bodyText,
              sound: "default",
              data: { conversationId: convId, senderName },
            },
            trigger: null,
          });
        } catch {}
      }

      prevMessagesCountRef.current = newMessages;
      setCounts({ messages: newMessages, connections: newConnections });

      if (Platform.OS !== "web") {
        await Notifications.setBadgeCountAsync(newMessages + newConnections).catch(() => {});
      }
    } catch {}
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts({ messages: 0, connections: 0 });
      prevMessagesCountRef.current = null;
      return undefined;
    }
    refresh();
    const timer = setInterval(() => refresh(), POLL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled, refresh]);

  return (
    <NotificationContext.Provider value={{ ...counts, expoPushToken, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
