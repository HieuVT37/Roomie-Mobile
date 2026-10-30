import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { loginApi, meApi } from "../api/auth";

const AuthContext = createContext(/** @type {any} */ (null));

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const sessionChanged = () => new Error("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const generation = useRef(0);
  const refreshRequest = useRef(/** @type {{ version: number, promise: Promise<any> } | null} */ (null));
  const tokenWrites = useRef(Promise.resolve());

  const isCurrent = useCallback((version) => mounted.current && generation.current === version, []);

  // Serialize writes/deletes: a slow logout or 401 cleanup cannot delete the
  // token written by a newer login. Reads wait for these writes as well.
  const writeToken = useCallback((version, change, completeIfSessionChanges = false) => {
    if (!isCurrent(version)) return Promise.resolve(false);
    const operation = tokenWrites.current.then(async () => {
      // A validated deletion must finish even if a newer login attempt fails.
      // New token writes still wait behind it and remain generation-guarded.
      if (!completeIfSessionChanges && !isCurrent(version)) return false;
      await change();
      return isCurrent(version);
    });
    tokenWrites.current = operation.then(() => undefined, () => undefined);
    return operation;
  }, [isCurrent]);

  const refreshSession = useCallback(function refreshCurrentSession({ force = false } = {}) {
    if (!mounted.current) return Promise.resolve(null);
    const version = generation.current;
    if (refreshRequest.current?.version === version) {
      const pending = refreshRequest.current.promise;
      if (!force) return pending;
      // A mutation needs a GET started after it completed, rather than a
      // snapshot from a request that was already in flight before the mutation.
      return pending.catch(() => null).then(() =>
        isCurrent(version) ? refreshCurrentSession() : null,
      );
    }

    const promise = (async () => {
      try {
        await tokenWrites.current;
        if (!isCurrent(version)) return null;
        const token = await SecureStore.getItemAsync("token");
        if (!isCurrent(version)) return null;
        if (!token) {
          setUser(null);
          setProfile(null);
          return null;
        }

        const data = await meApi();
        if (!isCurrent(version)) return null;
        if (!isRecord(data?.user) || (data.profile != null && !isRecord(data.profile))) {
          throw new Error("Dữ liệu phiên đăng nhập không hợp lệ. Vui lòng thử lại.");
        }
        const session = { user: data.user, profile: data.profile ?? null };
        setUser(session.user);
        setProfile(session.profile);
        return session;
      } catch (err) {
        if (!isCurrent(version)) return null;
        // Network/server errors leave the current canonical session untouched.
        if (err?.response?.status === 401) {
          try {
            await writeToken(version, () => SecureStore.deleteItemAsync("token"), true);
          } finally {
            if (isCurrent(version)) {
              setUser(null);
              setProfile(null);
            }
          }
        }
        if (!isCurrent(version)) return null;
        throw err;
      } finally {
        if (refreshRequest.current?.version === version) refreshRequest.current = null;
      }
    })();
    refreshRequest.current = { version, promise };
    return promise;
  }, [isCurrent, writeToken]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    refreshSession()
      .catch(() => {})
      .finally(() => {
        if (active && mounted.current) setLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
      generation.current += 1;
      refreshRequest.current = null;
    };
  }, [refreshSession]);

  const login = useCallback(async (email, password) => {
    const attempt = ++generation.current;
    refreshRequest.current = null;
    const data = await loginApi({ email, password });
    if (!isCurrent(attempt)) throw sessionChanged();
    if (typeof data?.token !== "string" || !data.token)
      throw new Error(
        "Máy chủ chưa hỗ trợ đăng nhập trên app (chưa cập nhật Bước 1)",
      );
    if (!isRecord(data.user) || (data.profile != null && !isRecord(data.profile))) {
      throw new Error("Dữ liệu phiên đăng nhập không hợp lệ. Vui lòng thử lại.");
    }
    // Invalidate a refresh that may have started while login was awaiting HTTP.
    const version = ++generation.current;
    refreshRequest.current = null;
    const written = await writeToken(version, () => SecureStore.setItemAsync("token", data.token));
    if (!written || !isCurrent(version)) throw sessionChanged();
    setUser(data.user);
    setProfile(data.profile ?? null);
  }, [isCurrent, writeToken]);

  // Tải lại user + hồ sơ từ server (dùng sau khi sửa hồ sơ để avatar/tên cập nhật ngay)
  const refreshProfile = useCallback(() => refreshSession({ force: true }), [refreshSession]);

  const logout = useCallback(async () => {
    const version = ++generation.current;
    refreshRequest.current = null;
    if (!mounted.current) return;
    setUser(null);
    setProfile(null);
    await writeToken(version, () => SecureStore.deleteItemAsync("token"), true);
  }, [writeToken]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshSession, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
