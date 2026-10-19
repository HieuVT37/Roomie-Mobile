import api from "./axios";

const d = (r) => r.data;

export const listConversationsApi = () => api.get("/conversations").then(d);
export const getMessagesApi = (id, since) =>
  api.get(`/conversations/${id}/messages`, { params: since ? { since } : {} }).then(d);

// files: [{ uri, name, type }]. Trên điện thoại, FormData nhận đối tượng { uri, name, type } thay cho File của trình duyệt
export const sendMessageApi = (id, text, files = []) => {
  if (files.length) {
    const form = new FormData();
    if (text) form.append("text", text);
    files.forEach((f) => form.append("images", f));
    return api
      .post(`/conversations/${id}/messages`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: (data) => data,
      })
      .then(d);
  }
  return api.post(`/conversations/${id}/messages`, { text }).then(d);
};
export const startConversationApi = (userId) => api.post("/conversations/start", { userId }).then(d);
