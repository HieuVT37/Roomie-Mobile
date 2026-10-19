import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getAccommodationApi } from "../../api/accommodations";
import { addFavoriteApi, removeFavoriteApi } from "../../api/favorites";
import { useAuth } from "../../auth/AuthContext";
import { MessageOwnerButton } from "../../components/MessageOwnerButton";
import { Chip, Gallery, Loading, useBottomPad } from "../../components/ui";
import {
  LISTING_STATUS_LABELS,
  ROOM_TYPE_LABELS,
  formatVND,
} from "../../utils/labels";

// Tông màu chủ đạo Dark Theme (Tím / Xanh đen)
const themeColors = {
  bg: "#0f172a", // Nền chính xanh đen
  card: "#1e293b", // Nền thẻ card
  border: "#334155", // Viền
  text: "#f8fafc", // Chữ chính sáng
  muted: "#94a3b8", // Chữ phụ xám
  primary: "#6366f1", // Tím nhấn
  price: "#818cf8", // Tím sáng nổi bật cho giá
  danger: "#ef4444", // Đỏ báo lỗi
};

// Component custom dòng thông tin hiển thị giá trị chữ trắng sáng (#f8fafc)
function CustomRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (!value && value !== 0) return null;
  return (
    <View style={sRow.row}>
      <Text style={sRow.label}>{label}</Text>
      <Text style={sRow.value}>{value}</Text>
    </View>
  );
}

export default function AccommodationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const bottom = useBottomPad();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fav, setFav] = useState(false);

  // Tải lại khi đăng nhập thay đổi để có số điện thoại liên hệ và trạng thái yêu thích
  useEffect(() => {
    let active = true;
    getAccommodationApi(id)
      .then((res) => {
        if (!active) return;
        setData(res);
        setFav(Boolean(res.isFavorite));
      })
      .catch(
        (err) =>
          active &&
          setError(err.response?.data?.message || "Không tải được tin"),
      );
    return () => {
      active = false;
    };
  }, [id, user?.id]);

  const toggleFavorite = async () => {
    if (!user) return router.push("/login");
    const next = !fav;
    setFav(next);
    try {
      await (next
        ? addFavoriteApi("accommodation", id)
        : removeFavoriteApi("accommodation", id));
    } catch {
      setFav(!next);
    }
  };

  if (error)
    return (
      <View style={s.center}>
        <Text style={s.error}>{error}</Text>
      </View>
    );
  if (!data) return <Loading />;

  const { listing: l, owner, isOwner, contactPhone } = data;
  const address = [
    l.address?.street,
    l.address?.ward,
    l.address?.district,
    l.address?.city,
  ]
    .filter(Boolean)
    .join(", ");
  const costs = l.extraCosts || {};

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      <Stack.Screen
        options={{
          title: l.title || "Chi tiết phòng trọ",
          headerStyle: { backgroundColor: themeColors.card },
          headerTintColor: themeColors.text,
          headerShadowVisible: false,
        }}
      />
      <Gallery images={l.images} />

      <View style={s.section}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={s.price}>
            {formatVND(l.price)}
            <Text style={s.muted}> /tháng</Text>
          </Text>
          {!isOwner && (
            <Pressable onPress={toggleFavorite} style={{ marginLeft: "auto" }}>
              <Text style={{ fontSize: 26 }}>{fav ? "❤️" : "🤍"}</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.title}>{l.title}</Text>
        {address ? <Text style={s.muted}>📍 {address}</Text> : null}
        <Text style={s.muted}>{(LISTING_STATUS_LABELS as any)[l.status]}</Text>
      </View>

      {l.description ? (
        <View style={s.card}>
          <Text style={s.h2}>Mô tả</Text>
          <Text style={{ color: themeColors.text, lineHeight: 22 }}>
            {l.description}
          </Text>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.h2}>Thông tin chi tiết</Text>
        <CustomRow
          label="Loại phòng"
          value={(ROOM_TYPE_LABELS as any)[l.roomType]}
        />
        <CustomRow label="Diện tích" value={l.area && `${l.area} m²`} />
        <CustomRow label="Số người tối đa" value={l.maxOccupants} />
        <CustomRow
          label="Tiền cọc"
          value={l.deposit != null ? formatVND(l.deposit) : null}
        />
        <CustomRow
          label="Có thể dọn vào"
          value={
            l.availableFrom &&
            new Date(l.availableFrom).toLocaleDateString("vi-VN")
          }
        />
        <CustomRow
          label="Giá điện"
          value={
            costs.electricity ? `${formatVND(costs.electricity)}/kWh` : null
          }
        />
        <CustomRow
          label="Giá nước"
          value={costs.water ? formatVND(costs.water) : null}
        />
        <CustomRow
          label="Internet"
          value={costs.internet ? formatVND(costs.internet) : null}
        />
        <CustomRow label="Chi phí khác" value={costs.other} />
      </View>

      {l.amenities?.length > 0 && (
        <View style={s.card}>
          <Text style={s.h2}>Tiện nghi</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 4,
            }}
          >
            {l.amenities.map((a: string) => (
              <Chip key={a} text={a} />
            ))}
          </View>
        </View>
      )}

      {l.rentalTerms ? (
        <View style={s.card}>
          <Text style={s.h2}>Điều khoản thuê</Text>
          <Text style={{ color: themeColors.text, lineHeight: 22 }}>
            {l.rentalTerms}
          </Text>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.h2}>Chủ trọ</Text>
        <Text
          style={{ fontWeight: "600", color: themeColors.text, fontSize: 16 }}
        >
          {owner.displayName}
        </Text>
        {user ? (
          contactPhone ? (
            <Pressable
              style={s.button}
              onPress={() => Linking.openURL(`tel:${contactPhone}`)}
            >
              <Text style={s.buttonText}>📞 Gọi {contactPhone}</Text>
            </Pressable>
          ) : (
            <Text style={s.muted}>Chủ trọ chưa để lại số điện thoại.</Text>
          )
        ) : (
          <Pressable style={s.button} onPress={() => router.push("/login")}>
            <Text style={s.buttonText}>Đăng nhập để xem liên hệ</Text>
          </Pressable>
        )}
        {user && !isOwner && user.role !== "admin" && (
          <View style={{ marginTop: 8 }}>
            <MessageOwnerButton
              userId={owner.userId}
              name={owner.displayName}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const sRow = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  label: {
    fontSize: 14,
    color: themeColors.muted,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColors.text, // Giá trị chữ TRẮNG SÁNG (#f8fafc)
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.bg },
  center: {
    flex: 1,
    backgroundColor: themeColors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  section: { padding: 16, gap: 6 },
  card: {
    backgroundColor: themeColors.card,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: "700", color: themeColors.text },
  price: { fontSize: 22, fontWeight: "800", color: themeColors.price },
  h2: {
    fontSize: 17,
    fontWeight: "700",
    color: themeColors.text,
    marginBottom: 4,
  },
  muted: { color: themeColors.muted, fontSize: 14, fontWeight: "400" },
  button: {
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { margin: 20, color: themeColors.danger, textAlign: "center" },
});
