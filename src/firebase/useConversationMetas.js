import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, isFirebaseConfigured } from "./config";

/**
 * Hook lắng nghe realtime lastMessage & updatedAt của danh sách hội thoại từ Firestore
 */
export default function useConversationMetas(conversationIds = []) {
  const [metas, setMetas] = useState({});
  const idsKey = Array.isArray(conversationIds) ? conversationIds.join(",") : "";

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !idsKey) return undefined;

    const ids = idsKey.split(",").filter(Boolean);
    const unsubs = ids.map((id) => {
      const ref = doc(db, "conversations", String(id));
      return onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setMetas((prev) => ({
              ...prev,
              [id]: snap.data(),
            }));
          }
        },
        () => {},
      );
    });

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [idsKey]);

  return metas;
}
