import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { imageUrl } from "../api/axios";
import {
    LISTING_STATUS_LABELS,
    MODERATION_LABELS,
    PASS_TYPE_LABELS,
    ROOM_TYPE_LABELS,
    formatVND,
    passPriceText,
} from "../utils/labels";
import { ListingImage } from "./listing-image";
import { colors, shared } from "./ui";

// 1. CARD PHÒNG TRỌ (Accommodation)
export function AccommodationCard({ item, showStatus = false }: { item: any; showStatus?: boolean }) {
  const router = useRouter();
  const firstImage = Array.isArray(item.images) ? item.images[0] : undefined;
  const id = item.id || item._id;
  const canOpen = (typeof id === "string" && !!id.trim()) || (typeof id === "number" && Number.isFinite(id));
  const sub = [
    typeof item.address === "string" ? item.address : item.address?.district,
    item.area != null && `${item.area} m²`,
    (ROOM_TYPE_LABELS as any)[item.roomType],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={[shared.card, s.cardWrapper]}
      disabled={!canOpen}
      accessibilityRole="button"
      accessibilityState={{ disabled: !canOpen }}
      onPress={() =>
        router.push({
          pathname: "/accommodation/[id]",
          params: { id: String(id) },
        })
      }
    >
      <ListingImage uri={firstImage} />
      <View style={{ padding: 12, gap: 3 }}>
        <Text style={s.price}>
          {formatVND(item.price)}
          <Text style={s.muted}>/tháng</Text>
        </Text>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        {sub ? <Text style={s.muted}>{sub}</Text> : null}
        {showStatus && (
          <View style={{ gap: 4, marginTop: 6 }}>
            {typeof item.status === "string" && item.status ? (
              <Text style={s.muted}>Trạng thái: {(LISTING_STATUS_LABELS as Record<string, string>)[item.status] || item.status}</Text>
            ) : null}
            {typeof item.moderationStatus === "string" && item.moderationStatus ? (
              <Text style={s.muted}>Kiểm duyệt: {(MODERATION_LABELS as Record<string, string>)[item.moderationStatus] || item.moderationStatus}</Text>
            ) : null}
            {typeof item.rejectionReason === "string" && item.rejectionReason.trim() ? (
              <Text style={s.rejection}>Lý do từ chối: {item.rejectionReason}</Text>
            ) : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// 2. CARD PASS ĐỒ (PassCard)
export function PassCard({ item }: { item: any }) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 24;
  
  // Tỉ lệ 3:4 - chiều cao = 3, chiều rộng = 4
  const imgHeight = Math.round((cardWidth * 3) / 4);
  
  const firstImage = item.images?.[0] ? (imageUrl(item.images[0]) as string) : undefined;
  const id = item.id || item._id;

  return (
    <Pressable
      style={[shared.card, s.cardWrapper]}
      onPress={() =>
        router.push({ pathname: "/pass/[id]", params: { id: String(id) } })
      }
    >
      {firstImage ? (
        <View style={{ width: "100%", height: imgHeight, overflow: "hidden" }}>
          {/* Background blurred image */}
          <Image
            source={{ uri: firstImage }}
            style={{ position: "absolute", width: "100%", height: "100%" }}
            resizeMode="cover"
            blurRadius={20}
          />
          {/* Foreground sharp image */}
          <Image
            source={{ uri: firstImage }}
            style={{ width: "100%", height: imgHeight }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[{ width: "100%", height: imgHeight, backgroundColor: "#1e293b" }, s.coverEmpty]}>
          <Text style={{ fontSize: 40 }}>📦</Text>
        </View>
      )}
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={s.badge}>{(PASS_TYPE_LABELS as any)[item.type]}</Text>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={s.price}>{passPriceText(item)}</Text>
        {item.area ? <Text style={s.muted}>📍 {item.area}</Text> : null}
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
  rejection: { color: "#fca5a5", fontSize: 13 },
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
