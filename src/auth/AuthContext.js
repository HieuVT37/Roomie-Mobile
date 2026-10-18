import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";
import { loginApi, meApi } from "../api/auth";

const AuthContext = createContext(/** @type {any} */ (null));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mở app: có token thì hỏi server xem còn hiệu lực không
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (token) {
          const data = await meApi();
          setUser(data.user);
          setProfile(data.profile);
        }
      } catch (err) {
        // Chỉ xóa token khi server báo hết hạn, không xóa khi chỉ bị lỗi mạng
        if (err.response?.status === 401)
          await SecureStore.deleteItemAsync("token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi({ email, password });
    if (!data.token)
      throw new Error(
        "Máy chủ chưa hỗ trợ đăng nhập trên app (chưa cập nhật Bước 1)",
      );
    await SecureStore.setItemAsync("token", data.token);
    setUser(data.user);
    setProfile(data.profile);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("token");
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
