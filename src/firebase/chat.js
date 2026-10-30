import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ensureFirebaseAuth } from "./auth";
import { db, isFirebaseConfigured } from "./config";

/**
 * Lắng nghe tin nhắn realtime từ Firestore: conversations/{conversationId}/messages
 */
export function subscribeConversationMessages(conversationId, onMessagesChange, onError) {
  if (!isFirebaseConfigured || !db || !conversationId) {
    return () => {};
  }

  const messagesRef = collection(db, "conversations", String(conversationId), "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAtIso =
          data.createdAt?.toDate?.()?.toISOString?.() ||
          data.sentAt ||
          new Date().toISOString();
        return {
          _id: d.id,
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName || "",
          text: data.text || "",
          images: Array.isArray(data.images) ? data.images : [],
          createdAt: createdAtIso,
        };
      });
      onMessagesChange(items);
    },
    (err) => {
      console.log("Firestore subscribe messages warning:", err?.message || err);
      if (onError) onError(err);
    },
  );

  return unsubscribe;
}

/**
 * Ghi tin nhắn mới (văn bản + danh sách link ảnh Firebase Storage) vào Firestore
 * và cập nhật metadata của cuộc trò chuyện (lastMessage, updatedAt)
 */
export async function sendFirestoreMessage(
  conversationId,
  { senderId, senderName, text = "", images = [], participants = [], messageId = null },
) {
  if (!isFirebaseConfigured || !db || !conversationId) {
    return null;
  }

  await ensureFirebaseAuth();
  const convIdStr = String(conversationId);
  const messagesRef = collection(db, "conversations", convIdStr, "messages");

  const payload = {
    senderId: String(senderId),
    senderName: senderName || "",
    text: text.trim(),
    images: Array.isArray(images) ? images : [],
    createdAt: serverTimestamp(),
    sentAt: new Date().toISOString(),
  };

  // Dùng đúng id tin nhắn của server làm id document -> tin từ server và từ Firestore
  // trùng id nên màn hình chat gộp thành 1 (không hiện 2 lần).
  let docRef;
  if (messageId) {
    docRef = doc(messagesRef, String(messageId));
    await setDoc(docRef, payload);
  } else {
    docRef = await addDoc(messagesRef, payload);
  }

  const convRef = doc(db, "conversations", convIdStr);
  const metaPayload = {
    lastMessage: {
      id: docRef.id,
      senderId: String(senderId),
      senderName: senderName || "",
      text: text.trim(),
      images: Array.isArray(images) ? images : [],
      sentAt: new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
  };
  if (participants && participants.length > 0) {
    metaPayload.participants = participants.map(String);
  }

  await setDoc(convRef, metaPayload, { merge: true });

  return {
    _id: docRef.id,
    id: docRef.id,
    ...payload,
    createdAt: payload.sentAt,
  };
}
