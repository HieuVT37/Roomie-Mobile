import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { imageUrl } from "../api/axios";
import {
    PASS_TYPE_LABELS,
    ROOM_TYPE_LABELS,
    formatVND,
    passPriceText,
} from "../utils/labels";
import { colors, shared } from "./ui";

/**
 * Hook tính chiều cao ảnh theo tỉ lệ thực tế của ảnh đầu tiên.
 * Nếu không lấy được, trả về giá trị mặc định.
 */
function useImageAspectHeight(uri: string | undefined, containerWidth: number, fallback = 220) {
  const [height, setHeight] = useState(fallback);
  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0) setHeight(Math.round((h / w) * containerWidth));
      },
      () => setHeight(fallback),
    );
  }, [uri, containerWidth, fallback]);
  return height;
}

// 1. CARD PHÒNG TRỌ (Accommodation)
export function AccommodationCard({ item }: { item: any }) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 24; // trừ padding ngang 12*2
  const firstImage = item.images?.[0] ? (imageUrl(item.images[0]) as string) : undefined;
  const imgHeight = useImageAspectHeight(firstImage, cardWidth);

  const id = item.id || item._id;
  const sub = [
    item.address?.district,
    item.area && `${item.area} m²`,
    (ROOM_TYPE_LABELS as any)[item.roomType],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={[shared.card, s.cardWrapper]}
      onPress={() =>
        router.push({
          pathname: "/accommodation/[id]",
          params: { id: String(id) },
        })
      }
    >
      {firstImage ? (
        <Image
          source={{ uri: firstImage }}
          style={{ width: "100%", height: imgHeight, backgroundColor: "#334155" }}
          resizeMode="contain"
        />
      ) : (
        <View style={[{ width: "100%", height: 180, backgroundColor: "#334155" }, s.coverEmpty]}>
          <Text style={{ fontSize: 40 }}>🏠</Text>
        </View>
      )}
      <View style={{ padding: 12, gap: 3 }}>
        <Text style={s.price}>
          {formatVND(item.price)}
          <Text style={s.muted}>/tháng</Text>
        </Text>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        {sub ? <Text style={s.muted}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

// 2. CARD PASS ĐỒ & PASS PHÒNG (PassCard)
export function PassCard({ item }: { item: any }) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 24;
  const firstImage = item.images?.[0] ? (imageUrl(item.images[0]) as string) : undefined;
  // Tỉ lệ 3:4 (chiều cao = 3, chiều rộng = 4)
  const imgHeight = Math.round((cardWidth * 3) / 4);

  const id = item.id || item._id;

  return (
    <Pressable
      style={[shared.card, s.cardWrapper]}
      onPress={() =>
        router.push({ pathname: "/pass/[id]", params: { id: String(id) } })
      }
    >
      {firstImage ? (
        <View style={{ width: "100%", height: imgHeight, backgroundColor: "#334155", overflow: "hidden" }}>
          {/* Nền mờ */}
          <Image
            source={{ uri: firstImage }}
            style={{ 
              position: "absolute", 
              width: "100%", 
              height: "100%" 
            }}
            resizeMode="cover"
            blurRadius={20}
          />
          {/* Ảnh chính ở giữa */}
          <Image
            source={{ uri: firstImage }}
            style={{ 
              position: "absolute", 
              width: "100%", 
              height: "100%" 
            }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[{ width: "100%", height: imgHeight, backgroundColor: "#334155" }, s.coverEmpty]}>
          <Text style={{ fontSize: 40 }}>{item.type === 'room' ? '🏠' : '📦'}</Text>
        </View>
      )}
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={s.badge}>{(PASS_TYPE_LABELS as any)[item.type]}</Text>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={s.price}>{passPriceText(item)}</Text>
        {(item.area || item.roomInfo?.address) ? <Text style={s.muted}>📍 {item.area || item.roomInfo?.address}</Text> : null}
      </View>
    </Pressable>
  );
}

// 3. CARD NGƯỜI DÙNG KẾT NỐI (UserCard)
export function UserCard({ item }: { item: any }) {
  const router = useRouter();
  const id = item.id || item._id;

  return (
    <Pressable
      style={[shared.card, s.userCard]}
      onPress={() =>
        router.push({ pathname: "/profile/[id]", params: { id: String(id) } })
      }
    >
      <View style={s.userHeader}>
        <Image
          source={{
            uri: item.avatarUrl || "https://via.placeholder.com/100",
          }}
          style={s.avatar}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={s.userNameRow}>
            <Text style={s.userName}>{item.fullName || item.name}</Text>
            {item.matchRate ? (
              <View style={s.matchBadge}>
                <Text style={s.matchText}>{item.matchRate}%</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.muted}>
            {item.age ? `${item.age} tuổi · ` : ""}
            {item.gender ? `${item.gender} · ` : ""}
            {item.school || item.university || ""}
          </Text>
        </View>
      </View>

      {item.bio ? (
        <Text style={s.bioText} numberOfLines={2}>
          {item.bio}
        </Text>
      ) : null}

      <View style={s.tagContainer}>
        {item.budget ? (
          <View style={s.tag}>
            <Text style={s.tagText}>💰 {item.budget}</Text>
          </View>
        ) : null}
        {item.district || item.location ? (
          <View style={s.tag}>
            <Text style={s.tagText}>📍 {item.district || item.location}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  cardWrapper: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  coverEmpty: { alignItems: "center", justifyContent: "center" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
    fontWeight: "600",
  },
  price: { fontSize: 17, fontWeight: "700", color: "#818cf8" },
  title: { fontSize: 16, fontWeight: "600", color: "#f8fafc" },
  muted: { color: "#94a3b8", fontSize: 13, fontWeight: "400" },

  // Style cho UserCard
  userCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    marginBottom: 12,
  },
  userHeader: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#334155",
  },
  userNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: { fontSize: 17, fontWeight: "700", color: "#f8fafc" },
  matchBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  matchText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  bioText: { marginTop: 8, fontSize: 14, color: "#cbd5e1", lineHeight: 20 },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, color: "#94a3b8" },
});
