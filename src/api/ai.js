import api from "./axios";

export const aiChatApi = (messages) =>
  api.post("/ai/chat", { messages }).then((r) => r.data);
