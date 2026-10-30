import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { imageUrl } from "../api/axios";
import { uploadImagesApi } from "../api/uploads";
import { ensureFirebaseAuth } from "./auth";
import { isFirebaseConfigured, storage } from "./config";

// Chuyển URI ảnh trên thiết bị thành Blob để đẩy lên Firebase Storage
async function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new Error("uriToBlob failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

/**
 * Tải 1 file ảnh lên Firebase Storage và trả về đường dẫn https://...
 * Nếu Firebase chưa cấu hình hoặc lỗi, tự động fallback sang API upload của Backend để không bao giờ chết tính năng.
 */
export async function uploadImageToFirebase(uri, folder = "uploads") {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  if (isFirebaseConfigured && storage) {
    try {
      await ensureFirebaseAuth();
      const blob = await uriToBlob(uri);
      const ext = (uri.split(".").pop() || "jpg").split("?")[0].toLowerCase();
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob, {
        contentType: ext === "png" ? "image/png" : "image/jpeg",
      });
      if (blob && typeof blob.close === "function") {
        blob.close();
      }
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      console.log("Firebase Storage upload fallback to server:", err?.message || err);
    }
  }

  // Fallback qua Backend API rồi ghép full https URL
  const res = await uploadImagesApi([
    {
      uri,
      name: `photo-${Date.now()}.jpg`,
      type: "image/jpeg",
    },
  ]);
  const urls = Array.isArray(res) ? res : res?.urls || res?.images || res?.data || [];
  if (urls.length > 0) {
    return imageUrl(urls[0]);
  }
  throw new Error("Không tải được ảnh lên máy chủ / Firebase Storage");
}

/**
 * Tải nhiều ảnh (tối đa 4 ảnh trong chat) lên Firebase Storage song song
 */
export async function uploadMultipleImagesToFirebase(assets = [], folder = "chat") {
  const limited = assets.slice(0, 4);
  return Promise.all(
    limited.map((a) => uploadImageToFirebase(typeof a === "string" ? a : a.uri, folder)),
  );
}
