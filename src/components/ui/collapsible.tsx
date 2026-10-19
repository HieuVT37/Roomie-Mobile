import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { addFavoriteApi, removeFavoriteApi } from "../../api/favorites";
import { getPassApi } from "../../api/pass";
import { useAuth } from "../../auth/AuthContext";
import { MessageOwnerButton } from "../../components/MessageOwnerButton";
import { Gallery, Loading, useBottomPad } from "../../components/ui";
import {
  CONDITION_LABELS,
  DEAL_LABELS,
  ITEM_CATEGORY_LABELS,
  PASS_STATUS_LABELS,
  PASS_TYPE_LABELS,
  formatVND,
  passPriceText,
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
function CustomRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={sRow.row}>
      <Text style={sRow.label}>{label}</Text>
      <Text style={sRow.value}>{value}</Text>
    </View>
  );
}

export default function PassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const bottom = useBottomPad();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fav, setFav] = useState(false);

  // Tải lại khi đăng nhập thay đổi để có thông tin liên hệ và trạng thái yêu thích
  useEffect(() => {
    let active = true;
    getPassApi(id)
      .then((res) => {
        if (!active) return;
        setData(res);
        setFav(Boolean(res.isFavorite));
      })
      .catch(
        (err) =>
          active &&
          setError(err.response?.data?.message || "Không tải được bài đăng"),
      );
    return () => {
      active = false;
    };
  }, [id, user?.id]);

  const toggleFavorite = async () => {
    if (!user) return router.push("/login");
    const next = !fav;
    setFav(next); // cập nhật ngay, lỗi thì trả lại
    try {
      await (next ? addFavoriteApi("pass", id) : removeFavoriteApi("pass", id));
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

  const { listing: l, owner, isOwner, contact } = data;
  const room = l.roomInfo || {};
  const item = l.itemInfo || {};

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      <Stack.Screen
        options={{
          title: l.title || "Chi tiết Pass",
          headerStyle: { backgroundColor: themeColors.card },
          headerTintColor: themeColors.text,
          headerShadowVisible: false,
        }}
      />
      <Gallery images={l.images} emoji="📦" />

      <View style={s.section}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text style={s.badge}>{(PASS_TYPE_LABELS as any)[l.type]}</Text>
          <Text style={s.muted}>{(PASS_STATUS_LABELS as any)[l.status]}</Text>
          {!isOwner && (
            <Pressable onPress={toggleFavorite} style={{ marginLeft: "auto" }}>
              <Text style={{ fontSize: 26 }}>{fav ? "❤️" : "🤍"}</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.title}>{l.title}</Text>
        <Text style={s.price}>{passPriceText(l)}</Text>
        {l.area ? <Text style={s.muted}>📍 {l.area}</Text> : null}
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
        {l.type === "room" ? (
          <>
            <CustomRow label="Địa chỉ phòng" value={room.address} />
            <CustomRow
              label="Tiền cọc"
              value={room.deposit != null ? formatVND(room.deposit) : null}
            />
            <CustomRow
              label="Hợp đồng còn lại"
              value={
                room.remainingLeaseMonths != null
                  ? `${room.remainingLeaseMonths} tháng`
                  : null
              }
            />
            <CustomRow
              label="Bàn giao từ"
              value={
                room.availableFrom &&
                new Date(room.availableFrom).toLocaleDateString("vi-VN")
              }
            />
            <CustomRow
              label="Chủ nhà đồng ý"
              value={room.landlordAgreed ? "Có" : "Chưa xác nhận"}
            />
            <CustomRow label="Điều khoản" value={room.transferTerms} />
          </>
        ) : (
          <>
            <CustomRow
              label="Danh mục"
              value={(ITEM_CATEGORY_LABELS as any)[item.category]}
            />
            <CustomRow
              label="Tình trạng"
              value={(CONDITION_LABELS as any)[item.condition]}
            />
            <CustomRow
              label="Hình thức"
              value={(DEAL_LABELS as any)[item.dealType]}
            />
          </>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Người đăng</Text>
        <Text
          style={{ fontWeight: "600", color: themeColors.text, fontSize: 16 }}
        >
          {owner.displayName}
        </Text>
        {user ? (
          <Text
            style={{ color: themeColors.muted, marginTop: 6, fontSize: 14 }}
            selectable
          >
            {contact
              ? `📞 ${contact}`
              : "Người đăng chưa để lại thông tin liên hệ."}
          </Text>
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
    color: themeColors.text, // Ép giá trị thành màu TRẮNG SÁNG (#f8fafc)
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
  badge: {
    backgroundColor: themeColors.primary,
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: themeColors.text,
    marginTop: 4,
  },
  price: { fontSize: 20, fontWeight: "800", color: themeColors.price },
  h2: {
    fontSize: 17,
    fontWeight: "700",
    color: themeColors.text,
    marginBottom: 4,
  },
  muted: { color: themeColors.muted, fontSize: 13 },
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
