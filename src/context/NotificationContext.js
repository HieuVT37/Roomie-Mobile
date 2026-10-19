import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { notificationsApi } from "../api/notifications";

const NotificationContext = createContext(/** @type {any} */ ({ messages: 0, connections: 0, refresh: () => {} }));

const POLL_MS = 10000;

// Số tin nhắn chưa đọc và thông báo kết nối chưa xem, dùng cho huy hiệu số trên thanh tab.
// Chỉ hỏi server khi app đang mở trên màn hình.
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ messages: 0, connections: 0 });
  const enabled = Boolean(user) && user.role !== "admin";

  const refresh = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return notificationsApi()
      .then((res) => setCounts({ messages: res.messages || 0, connections: res.connections || 0 }))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts({ messages: 0, connections: 0 });
      return undefined;
    }
    refresh();
    const timer = setInterval(() => AppState.currentState === "active" && refresh(), POLL_MS);
    const sub = AppState.addEventListener("change", (state) => state === "active" && refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled, refresh]);

  return <NotificationContext.Provider value={{ ...counts, refresh }}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => useContext(NotificationContext);
