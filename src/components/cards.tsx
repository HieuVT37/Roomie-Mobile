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

// 1B. CARD QUẢN LÝ PHÒNG TRỌ (Tin của tôi trong Tìm phòng)
export function AccommodationMineCard({
  item,
  onEdit,
  onDelete,
  onSetStatus,
}: {
  item: any;
  onEdit: () => void;
  onDelete: () => void;
  onSetStatus?: (status: "active" | "completed" | "closed") => void;
}) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 24;
  const imgHeight = Math.round((cardWidth * 3) / 4);

  const firstImage = Array.isArray(item.images) && item.images[0] ? (imageUrl(item.images[0]) as string) : undefined;
  const id = item.id || item._id;

  const badgeText =
    (ROOM_TYPE_LABELS as any)[item.roomType] ||
    item.roomType ||
    (PASS_TYPE_LABELS as any)[item.type] ||
    "Phòng trọ";

  let locationText = "";
  if (typeof item.address === "string" && item.address.trim()) {
    locationText = item.address.trim();
  } else if (item.address && typeof item.address === "object") {
    const parts = [item.address.ward, item.address.district, item.address.city].filter(Boolean);
    locationText = parts.length > 0 ? parts.join(", ") : (item.address.street || "");
  } else if (typeof item.area === "string" && item.area.trim()) {
    locationText = item.area.trim();
  }

  const isApproved = item.moderationStatus === "approved";
  const isRejected = item.moderationStatus === "rejected";
  const dotColor = isApproved ? "#22c55e" : isRejected ? "#ef4444" : "#f59e0b";
  const statusLabel = isApproved
    ? "Đã duyệt công khai"
    : isRejected
      ? "Bị từ chối"
      : "Chờ quản trị duyệt";

  return (
    <Pressable
      style={s.mineCardContainer}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/accommodation/[id]",
          params: { id: String(id) },
        })
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
          <Text style={{ fontSize: 40 }}>🏠</Text>
        </View>
      )}

      <View style={{ padding: 14, gap: 6 }}>
        {/* Badge */}
        <View style={s.pillBadge}>
          <Text style={s.pillBadgeText}>{badgeText}</Text>
        </View>

        {/* Title */}
        <Text style={s.mineCardTitle} numberOfLines={2}>
          {item.title || "Bài đăng phòng"}
        </Text>

        {/* Price */}
        <Text style={s.mineCardPrice}>
          {item.price != null ? formatVND(item.price) : "Thỏa thuận"}
          {item.price != null ? <Text style={s.mineCardPriceUnit}>/tháng</Text> : null}
        </Text>

        {/* Location */}
        {locationText ? (
          <Text style={s.mineCardLocation} numberOfLines={1}>
            📍 {locationText}
          </Text>
        ) : null}

        {/* Bottom row: Status & Actions */}
        <View style={s.mineCardFooter}>
          <View style={s.mineStatusRow}>
            <View style={[s.mineStatusDot, { backgroundColor: dotColor }]} />
            <Text style={s.mineStatusText}>{statusLabel}</Text>
          </View>

          <View style={s.mineBtnGroup}>
            <Pressable
              style={s.mineEditButton}
              accessibilityRole="button"
              accessibilityLabel="Sửa bài đăng"
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Text style={s.mineEditButtonText}>Sửa</Text>
            </Pressable>
            <Pressable
              style={s.mineDeleteButton}
              accessibilityRole="button"
              accessibilityLabel="Xóa bài đăng"
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Text style={s.mineDeleteButtonText}>Xóa</Text>
            </Pressable>
          </View>
        </View>

        {/* Rejection reason if rejected */}
        {item.moderationStatus === "rejected" && item.rejectionReason ? (
          <View style={s.rejectionBox}>
            <Text style={s.rejectionLabel}>Lý do từ chối:</Text>
            <Text style={s.rejectionText}>{item.rejectionReason}</Text>
          </View>
        ) : null}

        {/* Quick status change buttons if approved */}
        {item.moderationStatus === "approved" && onSetStatus ? (
          <View style={s.statusToggleWrap}>
            <Text style={s.statusToggleLabel}>Thay đổi trạng thái:</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {item.status !== "completed" && (
                <Pressable
                  style={s.statusActionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onSetStatus("completed");
                  }}
                >
                  <Text style={s.statusActionBtnText}>✓ Đã cho thuê</Text>
                </Pressable>
              )}
              {item.status !== "closed" && (
                <Pressable
                  style={s.statusActionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onSetStatus("closed");
                  }}
                >
                  <Text style={s.statusActionBtnText}>✕ Đóng tin</Text>
                </Pressable>
              )}
              {item.status !== "active" && (
                <Pressable
                  style={[s.statusActionBtn, { borderColor: "#22c55e" }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onSetStatus("active");
                  }}
                >
                  <Text style={[s.statusActionBtnText, { color: "#22c55e" }]}>↺ Mở lại</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
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
  
  // Style cho AccommodationMineCard
  mineCardContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  pillBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#4f46e5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  pillBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  mineCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 2,
  },
  mineCardPrice: {
    fontSize: 17,
    fontWeight: "700",
    color: "#818cf8",
    marginTop: 1,
  },
  mineCardPriceUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#818cf8",
  },
  mineCardLocation: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "400",
    marginTop: 1,
  },
  mineCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 4,
  },
  mineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  mineStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mineStatusText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  mineBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mineEditButton: {
    backgroundColor: "#312e81",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mineEditButtonText: {
    color: "#c7d2fe",
    fontWeight: "600",
    fontSize: 13,
  },
  mineDeleteButton: {
    backgroundColor: "#450a0a",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mineDeleteButtonText: {
    color: "#fca5a5",
    fontWeight: "600",
    fontSize: 13,
  },
  rejectionBox: {
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  rejectionLabel: {
    color: "#fca5a5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  rejectionText: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 18,
  },
  statusToggleWrap: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#334155",
  },
  statusToggleLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6,
  },
  statusActionBtn: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActionBtnText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "600",
  },
});
