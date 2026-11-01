import { signInAnonymously } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config";

// Đảm bảo phiên Firebase Auth được khởi tạo để vượt qua rule request.auth != null nếu bật
export async function ensureFirebaseAuth() {
  if (!isFirebaseConfigured || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    return null;
  }
}
