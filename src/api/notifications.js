import api from "./axios";

export const notificationsApi = () => api.get("/notifications").then((r) => r.data);

export const registerPushTokenApi = (pushToken, platform) =>
  api.post("/notifications/push-token", { pushToken, token: pushToken, platform }).then((r) => r.data);
