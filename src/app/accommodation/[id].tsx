import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  deleteAccommodationApi,
  getAccommodationApi,
  setAccommodationStatusApi,
} from "../../api/accommodations";
import { addFavoriteApi, removeFavoriteApi } from "../../api/favorites";
import { useAuth } from "../../auth/AuthContext";
import { CreateAccommodationForm } from "../../components/accommodation/CreateAccommodationForm";
import { MessageOwnerButton } from "../../components/MessageOwnerButton";
import { Chip, Gallery, Loading, useBottomPad } from "../../components/ui";
import {
  formatVND,
  LISTING_STATUS_LABELS,
  ROOM_TYPE_LABELS
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
  const { id: routeId, edit } = useLocalSearchParams<{ id: string | string[]; edit?: string }>();
  const { user } = useAuth();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const sessionKey = user?.id || user?._id || user?.email || "guest";
  return (
    <AccommodationDetailContent
      key={`${id}:${sessionKey}:${edit === "true" ? "edit" : "view"}`}
      id={id}
      shouldEdit={edit === "true"}
    />
  );
}

function AccommodationDetailContent({ id, shouldEdit }: { id?: string; shouldEdit?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const bottom = useBottomPad();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fav, setFav] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showEditModal, setShowEditModal] = useState(shouldEdit || false);
  const [busyAction, setBusyAction] = useState(false);
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

  const handleDelete = () => {
    Alert.alert(
      "Xác nhận xóa bài đăng",
      "Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa bài",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setBusyAction(true);
            try {
              await deleteAccommodationApi(id);
              Alert.alert("Thành công", "Đã xóa bài đăng.");
              router.back();
            } catch (err: any) {
              Alert.alert(
                "Lỗi",
                err.response?.data?.message || "Không thể xóa bài đăng.",
              );
            } finally {
              setBusyAction(false);
            }
          },
        },
      ],
    );
  };

  const handleSetStatus = async (status: "active" | "completed" | "closed") => {
    if (!id) return;
    setBusyAction(true);
    try {
      await setAccommodationStatusApi(id, status);
      Alert.alert(
        "Thành công",
        `Đã cập nhật trạng thái bài viết thành "${(LISTING_STATUS_LABELS as any)[status] || status}".`,
      );
      retry();
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    } finally {
      setBusyAction(false);
    }
  };

  const loadData = () => retry();

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
  
  // Lấy số điện thoại từ nhiều nguồn có thể, ưu tiên theo thứ tự
  const contactPhone = 
    (typeof data.contact === "string" || typeof data.contact === "number" ? String(data.contact) : null) ||
    (typeof data.contactPhone === "string" || typeof data.contactPhone === "number" ? String(data.contactPhone) : null) ||
    (typeof l.contact === "string" || typeof l.contact === "number" ? String(l.contact) : null) ||
    (typeof l.contactPhone === "string" || typeof l.contactPhone === "number" ? String(l.contactPhone) : null) ||
    (typeof l.phone === "string" || typeof l.phone === "number" ? String(l.phone) : null);
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
        {/* CHỈ HIỂN THỊ TRẠNG THÁI KHI ĐÃ ĐƯỢC DUYỆT */}
        {l.moderationStatus === "approved" && (
          <Text style={s.muted}>{(LISTING_STATUS_LABELS as any)[l.status]}</Text>
        )}
      </View>

      {/* KHỐI DÀNH RIÊNG CHO NGƯỜI SỞ HỮU BÀI ĐĂNG (CHỈNH SỬA / XÓA) */}
      {isOwner && (
        <View style={s.ownerCard}>
          <Text style={s.ownerCardTitle}>⚙️ Quản lý bài đăng của bạn</Text>
          
          {/* Hiển thị trạng thái kiểm duyệt */}
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    l.moderationStatus === "approved"
                      ? "#22c55e"
                      : l.moderationStatus === "rejected"
                        ? "#ef4444"
                        : "#f59e0b",
                }}
              />
              <Text style={{ color: themeColors.muted, fontSize: 14 }}>
                {l.moderationStatus === "approved"
                  ? "Đã duyệt công khai"
                  : l.moderationStatus === "rejected"
                    ? "Bị từ chối"
                    : "Chờ quản trị duyệt"}
              </Text>
            </View>
            
            {/* Hiển thị lý do từ chối nếu có */}
            {l.moderationStatus === "rejected" && l.rejectionReason && (
              <View style={{ backgroundColor: "#450a0a", borderWidth: 1, borderColor: themeColors.danger, borderRadius: 8, padding: 10, marginTop: 8 }}>
                <Text style={{ color: "#fca5a5", fontSize: 12, fontWeight: "700", marginBottom: 4 }}>
                  Lý do từ chối:
                </Text>
                <Text style={{ color: "#fca5a5", fontSize: 12, lineHeight: 18 }}>
                  {l.rejectionReason}
                </Text>
              </View>
            )}
          </View>
          
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              style={s.editButton}
              disabled={busyAction}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={s.editButtonText}>✏️ Chỉnh sửa tin</Text>
            </Pressable>
            <Pressable
              style={s.deleteButton}
              disabled={busyAction}
              onPress={handleDelete}
            >
              <Text style={s.deleteButtonText}>🗑️ Xóa tin</Text>
            </Pressable>
          </View>

          {/* Đổi trạng thái bài viết - CHỈ HIỂN THỊ KHI ĐÃ ĐƯỢC DUYỆT */}
          {l.moderationStatus === "approved" && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: themeColors.border, paddingTop: 10 }}>
              <Text style={{ color: themeColors.muted, fontSize: 13, marginBottom: 8 }}>
                Thay đổi trạng thái bài viết:
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {l.status !== "completed" && (
                  <Pressable
                    style={s.statusActionBtn}
                    disabled={busyAction}
                    onPress={() => handleSetStatus("completed")}
                  >
                    <Text style={s.statusActionBtnText}>✓ Đã tìm được người</Text>
                  </Pressable>
                )}
                {l.status !== "closed" && (
                  <Pressable
                    style={s.statusActionBtn}
                    disabled={busyAction}
                    onPress={() => handleSetStatus("closed")}
                  >
                    <Text style={s.statusActionBtnText}>✕ Đóng tin</Text>
                  </Pressable>
                )}
                {l.status !== "active" && (
                  <Pressable
                    style={[s.statusActionBtn, { borderColor: themeColors.primary }]}
                    disabled={busyAction}
                    onPress={() => handleSetStatus("active")}
                  >
                    <Text style={[s.statusActionBtnText, { color: themeColors.primary }]}>
                      ↺ Mở lại bài đăng
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      )}

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

      {/* Modal Chỉnh sửa bài đăng */}
      {showEditModal && data && (
        <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
            {/* Modal Header */}
            <View style={sModal.header}>
              <Pressable 
                onPress={() => setShowEditModal(false)} 
                style={sModal.headerBtn}
              >
                <Text style={{ color: themeColors.muted, fontSize: 16 }}>Hủy</Text>
              </Pressable>
              <Text style={sModal.headerTitle}>Chỉnh sửa bài đăng</Text>
              <View style={sModal.headerBtn} />
            </View>
            
            {/* Form sử dụng component CreateAccommodationForm với mode="edit" */}
            <CreateAccommodationForm
              mode="edit"
              initialData={l}
              initialContact={contactPhone || ""}
              accommodationId={l.id || l._id}
              onSuccess={() => {
                setShowEditModal(false);
                loadData();
              }}
            />
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

// Component hiển thị thông báo lỗi trường nhập liệu
function FormFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text style={{ color: themeColors.danger, fontSize: 12, marginTop: -4 }}>
      {message}
    </Text>
  );
}

// EDIT ACCOMMODATION MODAL COMPONENT
function EditAccommodationModal({
  visible,
  initialListing,
  initialContact,
  initialData,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  initialListing: any;
  initialContact: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const scrollRef = useRef<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper clean numbers with commas/dots
  const cleanNumber = (val: string) => {
    const c = val.replace(/[.,\s]/g, "");
    return c ? Number(c) : 0;
  };

  // Basic fields
  const [title, setTitle] = useState(initialListing.title || "");
  const [description, setDescription] = useState(initialListing.description || "");
  const [price, setPrice] = useState(
    initialListing.price != null ? String(initialListing.price) : "",
  );
  const [deposit, setDeposit] = useState(
    initialListing.deposit != null ? String(initialListing.deposit) : "",
  );
  const [contact, setContact] = useState(() => {
    // Lấy số điện thoại từ nhiều nguồn có thể, ưu tiên theo thứ tự
    // Ưu tiên initialContact vì nó đã được tính toán từ nhiều nguồn phía trên
    const sources = {
      initialContact,
      "initialData?.contact": initialData?.contact,
      "initialData?.contactPhone": initialData?.contactPhone,
      "initialListing.contact": initialListing.contact,
      "initialListing.contactPhone": initialListing.contactPhone,
      "initialListing.phone": initialListing.phone,
    };
    
    // DEBUG: Hiển thị alert để xem nguồn dữ liệu
    const debugInfo = Object.entries(sources)
      .map(([key, val]) => `${key}: ${val || "null"}`)
      .join("\n");
    
    setTimeout(() => {
      Alert.alert("🔍 DEBUG Contact Sources", debugInfo);
    }, 500);
    
    const phone = 
      initialContact ||
      initialData?.contact ||
      initialData?.contactPhone ||
      initialListing.contact ||
      initialListing.contactPhone || 
      initialListing.phone ||
      "";
    
    return String(phone || "");
  });

  // Address fields
  const addr = typeof initialListing.address === "object" && initialListing.address ? initialListing.address : {};
  const [city, setCity] = useState(addr.city || "Hà Nội");
  const [district, setDistrict] = useState(addr.district || "");
  const [ward, setWard] = useState(addr.ward || "");
  const [street, setStreet] = useState(
    addr.street || (typeof initialListing.address === "string" ? initialListing.address : "")
  );

  // Detail fields
  const [roomType, setRoomType] = useState(initialListing.roomType || "single");
  const [area, setArea] = useState(
    initialListing.area != null ? String(initialListing.area) : "",
  );
  const [maxOccupants, setMaxOccupants] = useState(
    initialListing.maxOccupants != null ? String(initialListing.maxOccupants) : "",
  );
  const [availableFrom, setAvailableFrom] = useState(
    initialListing.availableFrom ? initialListing.availableFrom.slice(0, 10) : "",
  );

  // Extra costs
  const costs = initialListing.extraCosts || {};
  const [electricity, setElectricity] = useState(
    costs.electricity != null ? String(costs.electricity) : "",
  );
  const [water, setWater] = useState(
    costs.water != null ? String(costs.water) : "",
  );
  const [internet, setInternet] = useState(
    costs.internet != null ? String(costs.internet) : "",
  );
  const [otherCost, setOtherCost] = useState(costs.other || "");

  // Amenities & terms
  const [amenities, setAmenities] = useState<string[]>(
    Array.isArray(initialListing.amenities) ? initialListing.amenities : []
  );
  const [rentalTerms, setRentalTerms] = useState(initialListing.rentalTerms || "");

  // Images — normalize: API có thể trả về string[] hoặc { url: string }[]
  const normalizeImages = (raw: any[]): string[] =>
    (raw || []).map((img: any) => {
      if (typeof img === "string") return img;
      if (img && typeof img === "object") return img.url || img.uri || img.src || "";
      return "";
    }).filter(Boolean);

  const [images, setImages] = useState<string[]>(normalizeImages(initialListing.images));
  const [newImageAssets, setNewImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [saving, setSaving] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const AMENITIES = [
    "Điều hòa",
    "Nóng lạnh",
    "Giường",
    "Tủ quần áo",
    "Tủ lạnh",
    "Máy giặt",
    "Máy giặt chung",
    "Bếp",
    "Bếp riêng",
    "Wifi",
    "Chỗ để xe",
    "Thang máy",
    "Bảo vệ 24/7",
    "Ban công",
  ];

  const ROOM_TYPE_OPTIONS = [
    { key: "single", label: "Phòng đơn" },
    { key: "shared", label: "Ở ghép" },
    { key: "studio", label: "Studio" },
    { key: "apartment", label: "Căn hộ mini" },
    { key: "house", label: "Nhà nguyên căn" },
  ];

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề";
    } else if (title.trim().length < 5) {
      newErrors.title = "Tiêu đề phải có ít nhất 5 ký tự";
    }

    const numPrice = cleanNumber(price);
    if (!price.trim()) {
      newErrors.price = "Vui lòng nhập giá thuê";
    } else if (isNaN(numPrice) || numPrice <= 0) {
      newErrors.price = "Giá thuê phải là số lớn hơn 0";
    }

    if (deposit.trim()) {
      const numDeposit = cleanNumber(deposit);
      if (isNaN(numDeposit) || numDeposit < 0) {
        newErrors.deposit = "Tiền cọc không được âm";
      }
    }

    if (!street.trim()) newErrors.street = "Vui lòng nhập địa chỉ / số nhà, tên đường";
    if (!district.trim()) newErrors.district = "Vui lòng nhập quận/huyện";

    if (area.trim()) {
      const numArea = Number(area.trim().replace(/,/g, "."));
      if (isNaN(numArea) || numArea <= 0) {
        newErrors.area = "Diện tích phải là số lớn hơn 0";
      }
    }

    if (maxOccupants.trim()) {
      const numOcc = Number(maxOccupants.trim());
      if (isNaN(numOcc) || numOcc <= 0) {
        newErrors.maxOccupants = "Số người tối đa phải lớn hơn 0";
      }
    }

    if (contact.trim()) {
      const phone = contact.trim().replace(/[\s\-]/g, "");
      if (!/^0\d{9}$/.test(phone)) {
        newErrors.contact = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const scrollToError = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const toggleAmenity = (name: string) => {
    setAmenities((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const pickMoreImages = async () => {
    const totalCount = images.length + newImageAssets.length;
    if (totalCount >= 8) {
      Alert.alert("Giới hạn", "Tối đa chỉ được chọn 8 hình ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8 - totalCount,
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewImageAssets((prev) =>
        [...prev, ...result.assets].slice(0, 8 - images.length)
      );
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      scrollToError();
      return;
    }

    setSaving(true);
    try {
      // Upload new images
      let finalImages = [...images];
      if (newImageAssets.length > 0) {
        const files = newImageAssets.map((asset, i) => {
          const filename =
            asset.fileName ||
            asset.uri.split("/").pop() ||
            `edit_img_${Date.now()}_${i}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const ext = match ? match[1].toLowerCase() : "jpg";
          const mimeType =
            ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : "image/jpeg";
          return {
            uri: asset.uri,
            name: filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`,
            type: mimeType,
          } as any;
        });
        const uploadResult = await uploadImagesApi(files);
        const uploadedUrls = Array.isArray(uploadResult)
          ? uploadResult
          : uploadResult.urls || [];
        finalImages = [...finalImages, ...uploadedUrls];
      }

      // Prepare payload
      const numPrice = cleanNumber(price);
      const numDeposit = deposit.trim() ? cleanNumber(deposit) : undefined;
      const numArea = area.trim() ? Number(area.trim().replace(/,/g, ".")) : undefined;
      const numOccupants = maxOccupants.trim() ? Number(maxOccupants.trim()) : undefined;
      const numElec = electricity.trim() ? cleanNumber(electricity) : undefined;
      const numWater = water.trim() ? cleanNumber(water) : undefined;
      const numInternet = internet.trim() ? cleanNumber(internet) : undefined;

      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        deposit: numDeposit,
        contact: contact.trim(),
        contactPhone: contact.trim(),
        address: {
          city: city.trim() || "Hà Nội",
          district: district.trim(),
          ward: ward.trim(),
          street: street.trim(),
        },
        roomType,
        area: numArea,
        maxOccupants: numOccupants,
        availableFrom: availableFrom.trim() || null,
        extraCosts: {
          electricity: numElec,
          water: numWater,
          internet: numInternet,
          other: otherCost.trim() || undefined,
        },
        amenities,
        rentalTerms: rentalTerms.trim() || undefined,
        images: finalImages,
      };

      await updateAccommodationApi(initialListing.id || initialListing._id, payload);
      Alert.alert(
        "✅ Đã lưu thay đổi",
        "Bài viết đã được cập nhật và đang chờ quản trị viên duyệt lại. Sau khi được duyệt, thay đổi sẽ hiển thị công khai.",
        [{ text: "Đồng ý", onPress: onSuccess }]
      );
    } catch (err: any) {
      const errMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Không thể cập nhật bài đăng.";
      Alert.alert("Lỗi", errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
        {/* Modal Header */}
        <View style={sModal.header}>
          <Pressable onPress={onClose} style={sModal.headerBtn}>
            <Text style={{ color: themeColors.muted, fontSize: 16 }}>Hủy</Text>
          </Pressable>
          <Text style={sModal.headerTitle}>Chỉnh sửa bài đăng</Text>
          <Pressable onPress={handleSave} disabled={saving} style={sModal.headerBtn}>
            <Text style={{ color: themeColors.primary, fontSize: 16, fontWeight: "700" }}>
              {saving ? "Lưu..." : "Lưu"}
            </Text>
          </Pressable>
        </View>

        {/* @ts-ignore */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}
        >
          {/* Thông báo về kiểm duyệt */}
          <View
            style={{
              backgroundColor: "#1e3a8a",
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#3b82f6",
            }}
          >
            <Text style={{ color: "#93c5fd", fontSize: 13, lineHeight: 20 }}>
              ℹ️ <Text style={{ fontWeight: "700" }}>Lưu ý:</Text> Mọi chỉnh sửa
              cần được quản trị viên duyệt lại trước khi hiển thị công khai.
            </Text>
          </View>

          {/* Thông tin cơ bản */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Thông tin cơ bản</Text>

            <Text style={sModal.label}>Tiêu đề bài đăng *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.title && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={title}
              onChangeText={(val) => {
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                setTitle(val);
              }}
              placeholder="Tiêu đề bài đăng..."
              placeholderTextColor="#64748b"
            />
            <FormFieldError message={errors.title} />

            <Text style={sModal.label}>Mô tả phòng *</Text>
            <TextInput
              style={[
                sModal.input,
                { height: 90, textAlignVertical: "top" },
                errors.description && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={description}
              onChangeText={(val) => {
                if (errors.description)
                  setErrors((prev) => ({ ...prev, description: "" }));
                setDescription(val);
              }}
              placeholder="Mô tả chi tiết..."
              placeholderTextColor="#64748b"
              multiline
            />
            <FormFieldError message={errors.description} />

            <View style={sModal.twoCols}>
              <View style={sModal.col}>
                <Text style={sModal.label}>Giá thuê (VNĐ/tháng) *</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.price && { borderColor: themeColors.danger, borderWidth: 1 },
                  ]}
                  value={price}
                  onChangeText={(val) => {
                    if (errors.price) setErrors((prev) => ({ ...prev, price: "" }));
                    setPrice(val);
                  }}
                  placeholder="3000000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.price} />
              </View>

              <View style={sModal.col}>
                <Text style={sModal.label}>Tiền cọc (VNĐ) *</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.deposit && { borderColor: themeColors.danger, borderWidth: 1 },
                  ]}
                  value={deposit}
                  onChangeText={(val) => {
                    if (errors.deposit)
                      setErrors((prev) => ({ ...prev, deposit: "" }));
                    setDeposit(val);
                  }}
                  placeholder="500000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.deposit} />
              </View>
            </View>

            <Text style={sModal.label}>Số điện thoại liên hệ *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.contact && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={contact}
              onChangeText={(val) => {
                if (errors.contact) setErrors((prev) => ({ ...prev, contact: "" }));
                setContact(val);
              }}
              placeholder="0900000000"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
            <FormFieldError message={errors.contact} />
          </View>

          {/* Địa chỉ phòng */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Địa chỉ phòng</Text>

            <Text style={sModal.label}>Tỉnh / Thành phố *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.city && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={city}
              onChangeText={(val) => {
                if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                setCity(val);
              }}
              placeholder="Hà Nội"
              placeholderTextColor="#64748b"
            />
            <FormFieldError message={errors.city} />

            <Text style={sModal.label}>Quận / Huyện *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.district && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={district}
              onChangeText={(val) => {
                if (errors.district)
                  setErrors((prev) => ({ ...prev, district: "" }));
                setDistrict(val);
              }}
              placeholder="Thạch Thất"
              placeholderTextColor="#64748b"
            />
            <FormFieldError message={errors.district} />

            <Text style={sModal.label}>Phường / Xã *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.ward && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={ward}
              onChangeText={(val) => {
                if (errors.ward) setErrors((prev) => ({ ...prev, ward: "" }));
                setWard(val);
              }}
              placeholder="Phú Hữu"
              placeholderTextColor="#64748b"
            />
            <FormFieldError message={errors.ward} />

            <Text style={sModal.label}>Số nhà, đường *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.street && { borderColor: themeColors.danger, borderWidth: 1 },
              ]}
              value={street}
              onChangeText={(val) => {
                if (errors.street) setErrors((prev) => ({ ...prev, street: "" }));
                setStreet(val);
              }}
              placeholder="Số 12, Ngõ 1"
              placeholderTextColor="#64748b"
            />
            <FormFieldError message={errors.street} />
          </View>

          {/* Thông tin chi tiết */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Thông tin chi tiết</Text>

            <Text style={sModal.label}>Loại phòng *</Text>
            <View style={sModal.chipWrap}>
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    sModal.chip,
                    roomType === opt.key && sModal.chipActive,
                  ]}
                  onPress={() => setRoomType(opt.key)}
                >
                  <Text
                    style={[
                      sModal.chipText,
                      roomType === opt.key && sModal.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={sModal.twoCols}>
              <View style={sModal.col}>
                <Text style={sModal.label}>Diện tích (m²) *</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.area && { borderColor: themeColors.danger, borderWidth: 1 },
                  ]}
                  value={area}
                  onChangeText={(val) => {
                    if (errors.area) setErrors((prev) => ({ ...prev, area: "" }));
                    setArea(val);
                  }}
                  placeholder="25"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.area} />
              </View>

              <View style={sModal.col}>
                <Text style={sModal.label}>Số người tối đa *</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.maxOccupants && {
                      borderColor: themeColors.danger,
                      borderWidth: 1,
                    },
                  ]}
                  value={maxOccupants}
                  onChangeText={(val) => {
                    if (errors.maxOccupants)
                      setErrors((prev) => ({ ...prev, maxOccupants: "" }));
                    setMaxOccupants(val);
                  }}
                  placeholder="2"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.maxOccupants} />
              </View>
            </View>

            <Text style={sModal.label}>Có thể dọn vào *</Text>
            <Pressable style={sModal.input} onPress={() => setShowDatePicker(true)}>
              <Text
                style={{
                  color: availableFrom ? themeColors.text : "#64748b",
                }}
              >
                {availableFrom
                  ? new Date(availableFrom).toLocaleDateString("vi-VN")
                  : "Chọn ngày có thể dọn vào"}
              </Text>
            </Pressable>
            <FormFieldError message={errors.availableFrom} />
            {showDatePicker && (
              <DateTimePicker
                value={availableFrom ? new Date(availableFrom) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selectedDate) {
                    const formatted = selectedDate.toISOString().split("T")[0];
                    setAvailableFrom(formatted);
                    if (errors.availableFrom)
                      setErrors((prev) => ({ ...prev, availableFrom: "" }));
                  }
                }}
              />
            )}
          </View>

          {/* Chi phí dịch vụ */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Chi phí dịch vụ</Text>

            <View style={sModal.twoCols}>
              <View style={sModal.col}>
                <Text style={sModal.label}>Giá điện (đ/kWh)</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.electricity && {
                      borderColor: themeColors.danger,
                      borderWidth: 1,
                    },
                  ]}
                  value={electricity}
                  onChangeText={(val) => {
                    if (errors.electricity)
                      setErrors((prev) => ({ ...prev, electricity: "" }));
                    setElectricity(val);
                  }}
                  placeholder="3200"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.electricity} />
              </View>

              <View style={sModal.col}>
                <Text style={sModal.label}>Giá nước (đ/tháng)</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.water && {
                      borderColor: themeColors.danger,
                      borderWidth: 1,
                    },
                  ]}
                  value={water}
                  onChangeText={(val) => {
                    if (errors.water) setErrors((prev) => ({ ...prev, water: "" }));
                    setWater(val);
                  }}
                  placeholder="5000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.water} />
              </View>
            </View>

            <View style={sModal.twoCols}>
              <View style={sModal.col}>
                <Text style={sModal.label}>Internet (đ/tháng)</Text>
                <TextInput
                  style={[
                    sModal.input,
                    errors.internet && {
                      borderColor: themeColors.danger,
                      borderWidth: 1,
                    },
                  ]}
                  value={internet}
                  onChangeText={(val) => {
                    if (errors.internet)
                      setErrors((prev) => ({ ...prev, internet: "" }));
                    setInternet(val);
                  }}
                  placeholder="100000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <FormFieldError message={errors.internet} />
              </View>

              <View style={sModal.col}>
                <Text style={sModal.label}>Chi phí khác</Text>
                <TextInput
                  style={sModal.input}
                  value={otherCost}
                  onChangeText={setOtherCost}
                  placeholder="Mô tả..."
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
          </View>

          {/* Tiện nghi */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Tiện nghi phòng</Text>
            <View style={sModal.chipWrap}>
              {AMENITIES.map((item) => {
                const selected = amenities.includes(item);
                return (
                  <Pressable
                    key={item}
                    style={[sModal.chip, selected && sModal.chipActive]}
                    onPress={() => toggleAmenity(item)}
                  >
                    <Text
                      style={[
                        sModal.chipText,
                        selected && sModal.chipTextActive,
                      ]}
                    >
                      {selected ? `✓ ${item}` : item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Điều khoản */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Điều khoản thuê</Text>

            <Text style={sModal.label}>Điều khoản thuê *</Text>
            <TextInput
              style={[
                sModal.input,
                { height: 70, textAlignVertical: "top" },
                errors.rentalTerms && {
                  borderColor: themeColors.danger,
                  borderWidth: 1,
                },
              ]}
              value={rentalTerms}
              onChangeText={(val) => {
                if (errors.rentalTerms)
                  setErrors((prev) => ({ ...prev, rentalTerms: "" }));
                setRentalTerms(val);
              }}
              placeholder="Gọn gàng, sạch sẽ, không ồn ào..."
              placeholderTextColor="#64748b"
              multiline
            />
            <FormFieldError message={errors.rentalTerms} />
          </View>

          {/* Quản lý ảnh */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>
              Hình ảnh ({images.length + newImageAssets.length}/8)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginTop: 10 }}
            >
              <Pressable style={sModal.uploadBox} onPress={pickMoreImages}>
                <Text style={{ color: themeColors.primary, fontSize: 24 }}>+</Text>
                <Text style={{ color: themeColors.muted, fontSize: 11 }}>
                  Thêm ảnh
                </Text>
              </Pressable>

              {/* Ảnh mới chọn — hiển thị trước (đầu danh sách) */}
              {newImageAssets.map((asset, i) => (
                <View key={`new-${i}`} style={sModal.imgBox}>
                  <Image source={{ uri: asset.uri }} style={sModal.img} />
                  <Pressable
                    style={sModal.delBadge}
                    onPress={() =>
                      setNewImageAssets((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}

              {/* Ảnh hiện có — hiển thị sau */}
              {images.map((url, i) => (
                <View key={`exist-${i}`} style={sModal.imgBox}>
                  <Image source={{ uri: url }} style={sModal.img} />
                  <Pressable
                    style={sModal.delBadge}
                    onPress={() =>
                      setImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Quản lý trạng thái bài viết */}
          {initialListing.moderationStatus === "approved" && (
            <View style={sModal.card}>
              <Text style={sModal.cardTitle}>⚙️ Quản lý trạng thái</Text>
              <Text style={{ color: themeColors.muted, fontSize: 13, marginBottom: 8 }}>
                Thay đổi trạng thái hiển thị bài viết:
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {initialListing.status !== "completed" && (
                  <Pressable
                    style={sModal.statusBtn}
                    disabled={saving}
                    onPress={async () => {
                      if (!initialListing.id && !initialListing._id) return;
                      try {
                        await setAccommodationStatusApi(
                          initialListing.id || initialListing._id,
                          "completed"
                        );
                        Alert.alert(
                          "✓ Đã cập nhật",
                          "Trạng thái bài viết đã được chuyển sang 'Đã cho thuê'.",
                          [{ text: "OK", onPress: onSuccess }]
                        );
                      } catch (err: any) {
                        Alert.alert(
                          "Lỗi",
                          err.response?.data?.message || "Không thể cập nhật trạng thái."
                        );
                      }
                    }}
                  >
                    <Text style={sModal.statusBtnText}>✓ Đã cho thuê</Text>
                  </Pressable>
                )}
                {initialListing.status !== "closed" && (
                  <Pressable
                    style={sModal.statusBtn}
                    disabled={saving}
                    onPress={async () => {
                      if (!initialListing.id && !initialListing._id) return;
                      try {
                        await setAccommodationStatusApi(
                          initialListing.id || initialListing._id,
                          "closed"
                        );
                        Alert.alert(
                          "✓ Đã cập nhật",
                          "Trạng thái bài viết đã được chuyển sang 'Đóng tin'.",
                          [{ text: "OK", onPress: onSuccess }]
                        );
                      } catch (err: any) {
                        Alert.alert(
                          "Lỗi",
                          err.response?.data?.message || "Không thể cập nhật trạng thái."
                        );
                      }
                    }}
                  >
                    <Text style={sModal.statusBtnText}>✕ Đóng tin</Text>
                  </Pressable>
                )}
                {initialListing.status !== "active" && (
                  <Pressable
                    style={[sModal.statusBtn, { borderColor: themeColors.primary }]}
                    disabled={saving}
                    onPress={async () => {
                      if (!initialListing.id && !initialListing._id) return;
                      try {
                        await setAccommodationStatusApi(
                          initialListing.id || initialListing._id,
                          "active"
                        );
                        Alert.alert(
                          "✓ Đã cập nhật",
                          "Trạng thái bài viết đã được chuyển sang 'Đang hoạt động'.",
                          [{ text: "OK", onPress: onSuccess }]
                        );
                      } catch (err: any) {
                        Alert.alert(
                          "Lỗi",
                          err.response?.data?.message || "Không thể cập nhật trạng thái."
                        );
                      }
                    }}
                  >
                    <Text style={[sModal.statusBtnText, { color: themeColors.primary }]}>
                      ↺ Mở lại bài đăng
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Nút lưu */}
          <Pressable
            style={[sModal.saveBtn, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={handleSave}
          >
            <Text style={sModal.saveBtnText}>
              {saving ? "Đang lưu thay đổi..." : "Lưu thay đổi bài đăng"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
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
  ownerCard: {
    backgroundColor: "#1e1b4b",
    borderWidth: 1,
    borderColor: themeColors.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  ownerCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#a5b4fc",
  },
  editButton: {
    flex: 1,
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#450a0a",
    borderWidth: 1,
    borderColor: themeColors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fca5a5",
    fontWeight: "700",
    fontSize: 14,
  },
  statusActionBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActionBtnText: {
    color: themeColors.text,
    fontSize: 12,
    fontWeight: "600",
  },
});

// Modal Styles
const sModal = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  headerBtn: { padding: 4 },
  headerTitle: {
    color: themeColors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  card: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    color: themeColors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  input: {
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: themeColors.text,
    fontSize: 14,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  chipText: {
    color: themeColors.muted,
    fontSize: 13,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  uploadBox: {
    width: 70,
    height: 70,
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderStyle: "dashed",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  imgBox: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  img: { width: "100%", height: "100%" },
  delBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: themeColors.danger,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  statusBtn: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusBtnText: {
    color: themeColors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  twoCols: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
});
