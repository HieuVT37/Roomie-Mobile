import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const SERVER_URL = "https://roomie-bi5u.onrender.com";

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  timeout: 60000, // server miễn phí ngủ, lần đầu có thể mất ~1 phút để dậy
});

// Mỗi request gửi kèm token đã lưu
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Đường dẫn ảnh từ server là đường dẫn tương đối, cần ghép với địa chỉ server
export const imageUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${SERVER_URL}${path}`;
};

export default api;
