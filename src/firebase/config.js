import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Nguồn cấu hình (ưu tiên từ trên xuống):
// 1. Biến EXPO_PUBLIC_FIREBASE_* (EAS Environment variables hoặc .env khi dev local) -> ghi đè nếu có
// 2. app.json -> expo.extra.firebase (đã commit cùng repo, nên build tự động / CI không cần file .env)
// Lưu ý: Firebase *web config* là định danh công khai, không phải secret; an toàn nằm ở Security Rules.
const extra = (Constants.expoConfig?.extra?.firebase ?? {});

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.apiKey || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.authDomain || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.projectId || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.storageBucket || "",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.messagingSenderId || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.appId || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YourFirebaseApiKeyHere") &&
    firebaseConfig.projectId,
);

let app = null;
let db = null;
let storage = null;
let auth = null;

try {
  if (isFirebaseConfigured) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  }
} catch (err) {
  console.log("Firebase init warning:", err?.message || err);
}

export { app, auth, db, firebaseConfig, storage };
