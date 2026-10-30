import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
  if ((typeof value !== "string" && typeof value !== "number") || value === "") return null;
  return (
    <View style={sRow.row}>
      <Text style={sRow.label}>{label}</Text>
      <Text style={sRow.value}>{value}</Text>
    </View>
  );
}

export default function AccommodationDetailScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string | string[] }>();
  const { user } = useAuth();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const sessionKey = user?.id || user?._id || user?.email || "guest";
  return <AccommodationDetailContent key={`${id}:${sessionKey}`} id={id} />;
}

function AccommodationDetailContent({ id }: { id?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const bottom = useBottomPad();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fav, setFav] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  const favoritePending = useRef(false);

  // Identity/session changes remount this content, so private data and pending requests stay separate.
  useEffect(() => {
    let active = true;
    mounted.current = true;
    const load = id ? getAccommodationApi(id) : Promise.reject(new Error("Đường dẫn tin không hợp lệ."));
    load
      .then((res) => {
        if (!active) return;
        if (!res?.listing || typeof res.listing !== "object" || Array.isArray(res.listing)) {
          throw new Error("Dữ liệu tin không hợp lệ. Vui lòng thử lại.");
        }
        setData(res);
        setFav(Boolean(res.isFavorite));
        setError("");
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || err.message || "Không tải được tin");
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [id, attempt]);

  const retry = () => {
    setError("");
    setData(null);
    setAttempt((value) => value + 1);
  };

  const toggleFavorite = async () => {
    if (!user) return router.push("/login");
    if (!id || favoritePending.current) return;
    favoritePending.current = true;
    setFavoriteBusy(true);
    const next = !fav;
    setFav(next);
    try {
      await (next
        ? addFavoriteApi("accommodation", id)
        : removeFavoriteApi("accommodation", id));
    } catch (err: any) {
      if (mounted.current) {
        setFav(!next);
        Alert.alert("Không cập nhật được yêu thích", err.response?.data?.message || "Vui lòng thử lại.");
      }
    } finally {
      favoritePending.current = false;
      if (mounted.current) setFavoriteBusy(false);
    }
  };

  const callOwner = async (phone: string) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert("Không mở được cuộc gọi", "Thiết bị không thể mở ứng dụng gọi điện. Vui lòng thử lại hoặc gọi số liên hệ thủ công.");
    }
  };

  if (error)
    return (
      <View style={s.center}>
        <Text style={s.error}>{error}</Text>
        <Pressable style={s.button} onPress={retry} accessibilityRole="button">
          <Text style={s.buttonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  if (!data) return <Loading />;

  const { listing: l, isOwner } = data;
  const contactPhone = typeof data.contactPhone === "string" || typeof data.contactPhone === "number" ? data.contactPhone : null;
  const owner = data.owner && typeof data.owner === "object" ? data.owner : {};
  const title = typeof l.title === "string" ? l.title : "Chi tiết phòng trọ";
  const address = typeof l.address === "string" ? l.address : [
    l.address?.street,
    l.address?.ward,
    l.address?.district,
    l.address?.city,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(", ");
  const costs = l.extraCosts && typeof l.extraCosts === "object" ? l.extraCosts : {};
  const amenities = Array.isArray(l.amenities) ? l.amenities.filter((amenity: unknown) => typeof amenity === "string") : [];
  const availableDate = l.availableFrom ? new Date(l.availableFrom) : null;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      <Stack.Screen
        options={{
          title,
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
            <Pressable onPress={toggleFavorite} disabled={favoriteBusy} accessibilityRole="button" accessibilityLabel={fav ? "Bỏ yêu thích" : "Thêm yêu thích"} style={{ marginLeft: "auto", opacity: favoriteBusy ? 0.5 : 1 }}>
              <Text style={{ fontSize: 26 }}>{fav ? "❤️" : "🤍"}</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.title}>{title}</Text>
        {address ? <Text style={s.muted}>📍 {address}</Text> : null}
        <Text style={s.muted}>{(LISTING_STATUS_LABELS as any)[l.status]}</Text>
      </View>

      {typeof l.description === "string" && l.description ? (
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
        <CustomRow label="Diện tích" value={l.area != null ? `${l.area} m²` : null} />
        <CustomRow label="Số người tối đa" value={l.maxOccupants} />
        <CustomRow
          label="Tiền cọc"
          value={l.deposit != null ? formatVND(l.deposit) : null}
        />
        <CustomRow
          label="Có thể dọn vào"
          value={
            availableDate && !Number.isNaN(availableDate.getTime())
              ? availableDate.toLocaleDateString("vi-VN") : null
          }
        />
        <CustomRow
          label="Giá điện"
          value={
            costs.electricity != null ? `${formatVND(costs.electricity)}/kWh` : null
          }
        />
        <CustomRow
          label="Giá nước"
          value={costs.water != null ? formatVND(costs.water) : null}
        />
        <CustomRow
          label="Internet"
          value={costs.internet != null ? formatVND(costs.internet) : null}
        />
        <CustomRow label="Chi phí khác" value={costs.other} />
      </View>

      {amenities.length > 0 && (
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
            {amenities.map((a: string, index: number) => (
              <Chip key={`${a}-${index}`} text={a} />
            ))}
          </View>
        </View>
      )}

      {typeof l.rentalTerms === "string" && l.rentalTerms ? (
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
          {typeof owner.displayName === "string" ? owner.displayName : "Chưa có thông tin chủ trọ"}
        </Text>
        {user ? (
          contactPhone ? (
            <Pressable
              style={s.button}
              onPress={() => callOwner(String(contactPhone))}
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
            {typeof owner.userId === "string" && owner.userId ? (
              <MessageOwnerButton
                userId={owner.userId}
                name={typeof owner.displayName === "string" ? owner.displayName : undefined}
              />
            ) : <Text style={s.muted}>Chưa có thông tin tài khoản để nhắn tin.</Text>}
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
