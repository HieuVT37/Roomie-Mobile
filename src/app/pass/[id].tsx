import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { addFavoriteApi, removeFavoriteApi } from "../../api/favorites";
import {
    deletePassApi,
    getPassApi,
    setPassStatusApi,
    updatePassApi,
} from "../../api/pass";
import { uploadImagesApi } from "../../api/uploads";
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

const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
  price: "#818cf8",
  danger: "#ef4444",
  success: "#10b981",
  warning: "#d97706",
};

const CATEGORY_OPTIONS = [
  { key: "furniture", label: ITEM_CATEGORY_LABELS.furniture || "Nội thất" },
  { key: "appliance", label: ITEM_CATEGORY_LABELS.appliance || "Đồ điện" },
  { key: "kitchen", label: ITEM_CATEGORY_LABELS.kitchen || "Đồ bếp" },
  { key: "storage", label: ITEM_CATEGORY_LABELS.storage || "Đồ lưu trữ" },
  { key: "other", label: ITEM_CATEGORY_LABELS.other || "Khác" },
];

const CONDITION_OPTIONS = [
  { key: "new", label: CONDITION_LABELS.new || "Mới 100%" },
  { key: "like_new", label: CONDITION_LABELS.like_new || "Như mới" },
  { key: "good", label: CONDITION_LABELS.good || "Tốt" },
  { key: "fair", label: CONDITION_LABELS.fair || "Khá" },
  { key: "old", label: CONDITION_LABELS.old || "Cũ" },
];

const DEAL_OPTIONS = [
  { key: "sell", label: DEAL_LABELS.sell || "Bán" },
  { key: "give_away", label: DEAL_LABELS.give_away || "Cho tặng" },
  { key: "exchange", label: DEAL_LABELS.exchange || "Trao đổi" },
];

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

export default function PassDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const bottom = useBottomPad();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fav, setFav] = useState(false);
  const [showEditModal, setShowEditModal] = useState(edit === "true");
  const [busyAction, setBusyAction] = useState(false);

  const loadData = useCallback(() => {
    if (!id) return;
    getPassApi(id)
      .then((res) => {
        setData(res);
        setFav(Boolean(res.isFavorite));
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Không tải được bài đăng"),
      );
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData, user?.id]);

  const toggleFavorite = async () => {
    if (!user) return router.push("/login");
    const next = !fav;
    setFav(next);
    try {
      await (next ? addFavoriteApi("pass", id) : removeFavoriteApi("pass", id));
    } catch {
      setFav(!next);
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
            setBusyAction(true);
            try {
              await deletePassApi(id);
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
    setBusyAction(true);
    try {
      await setPassStatusApi(id, status);
      Alert.alert(
        "Thành công",
        `Đã cập nhật trạng thái bài viết thành "${(PASS_STATUS_LABELS as any)[status] || status}".`,
      );
      loadData();
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    } finally {
      setBusyAction(false);
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
      contentContainerStyle={{ paddingBottom: bottom + 40 }}
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

      {/* Thông tin chính */}
      <View style={s.section}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text style={s.badge}>{(PASS_TYPE_LABELS as any)[l.type]}</Text>
          <View
            style={[
              s.statusPill,
              {
                backgroundColor:
                  l.status === "active"
                    ? "#064e3b"
                    : l.status === "completed"
                      ? "#312e81"
                      : "#450a0a",
              },
            ]}
          >
            <Text
              style={{
                color:
                  l.status === "active"
                    ? "#6ee7b7"
                    : l.status === "completed"
                      ? "#a5b4fc"
                      : "#fca5a5",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {(PASS_STATUS_LABELS as any)[l.status] || l.status}
            </Text>
          </View>
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

      {/* KHỐI DÀNH RIÊNG CHO NGƯỜI SỞ HỮU BÀI ĐĂNG (CHỈNH SỬA / XÓA) */}
      {isOwner && (
        <View style={s.ownerCard}>
          <Text style={s.ownerCardTitle}>⚙️ Quản lý bài đăng của bạn</Text>
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

          {/* Đổi trạng thái bài viết */}
          <View
            style={{
              marginTop: 12,
              borderTopWidth: 1,
              borderColor: themeColors.border,
              paddingTop: 10,
            }}
          >
            <Text
              style={{
                color: themeColors.muted,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              Thay đổi trạng thái bài viết:
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {l.status !== "completed" && (
                <Pressable
                  style={s.statusActionBtn}
                  disabled={busyAction}
                  onPress={() => handleSetStatus("completed")}
                >
                  <Text style={s.statusActionBtnText}>✓ Đã pass xong</Text>
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
                  style={[
                    s.statusActionBtn,
                    { borderColor: themeColors.success },
                  ]}
                  disabled={busyAction}
                  onPress={() => handleSetStatus("active")}
                >
                  <Text
                    style={[
                      s.statusActionBtnText,
                      { color: themeColors.success },
                    ]}
                  >
                    ↺ Mở lại bài đăng
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Mô tả */}
      {l.description ? (
        <View style={s.card}>
          <Text style={s.h2}>Mô tả</Text>
          <Text style={{ color: themeColors.text, lineHeight: 22 }}>
            {l.description}
          </Text>
        </View>
      ) : null}

      {/* Thông tin chi tiết */}
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
              value={
                (ITEM_CATEGORY_LABELS as any)[item.category] || item.category
              }
            />
            <CustomRow
              label="Tình trạng"
              value={
                (CONDITION_LABELS as any)[item.condition] || item.condition
              }
            />
            <CustomRow
              label="Hình thức"
              value={(DEAL_LABELS as any)[item.dealType] || item.dealType}
            />
          </>
        )}
      </View>

      {/* Người đăng */}
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

      {/* Modal Chỉnh sửa bài đăng */}
      {showEditModal && (
        <EditPassModal
          visible={showEditModal}
          initialListing={l}
          initialContact={contact || ""}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadData();
          }}
        />
      )}
    </ScrollView>
  );
}

// Modal chỉnh sửa bài đăng
function EditPassModal({
  visible,
  initialListing,
  initialContact,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  initialListing: any;
  initialContact: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isRoom = initialListing.type === "room";
  const room = initialListing.roomInfo || {};
  const item = initialListing.itemInfo || {};
  const scrollRef = useRef<ScrollView | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [title, setTitle] = useState(initialListing.title || "");
  const [description, setDescription] = useState(
    initialListing.description || "",
  );
  const [price, setPrice] = useState(
    initialListing.price != null ? String(initialListing.price) : "",
  );
  const [area, setArea] = useState(initialListing.area || "");
  const [contact, setContact] = useState(initialContact || "");

  // Room fields
  const [address, setAddress] = useState(room.address || "");
  const [deposit, setDeposit] = useState(
    room.deposit != null ? String(room.deposit) : "",
  );
  const [remainingLeaseMonths, setRemainingLeaseMonths] = useState(
    room.remainingLeaseMonths != null ? String(room.remainingLeaseMonths) : "",
  );
  const [availableFrom, setAvailableFrom] = useState(
    room.availableFrom ? room.availableFrom.slice(0, 10) : "",
  );
  const [landlordAgreed, setLandlordAgreed] = useState(
    Boolean(room.landlordAgreed),
  );
  const [transferTerms, setTransferTerms] = useState(room.transferTerms || "");

  // Item fields
  const [category, setCategory] = useState(item.category || "furniture");
  const [condition, setCondition] = useState(item.condition || "good");
  const [dealType, setDealType] = useState(item.dealType || "sell");

  // Images
  const [images, setImages] = useState<string[]>(initialListing.images || []);
  const [newImageAssets, setNewImageAssets] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [saving, setSaving] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isRoom) {
      // Validate Pass Phòng
      if (!title.trim()) {
        newErrors.title = "Vui lòng nhập tiêu đề";
      } else if (title.trim().length < 10) {
        newErrors.title = "Tiêu đề phải có ít nhất 10 ký tự";
      } else if (title.trim().length > 100) {
        newErrors.title = "Tiêu đề không được quá 100 ký tự";
      }

      if (!address.trim()) {
        newErrors.address = "Vui lòng nhập địa chỉ phòng";
      }

      if (price && isNaN(Number(price))) {
        newErrors.price = "Giá phải là số";
      } else if (price && Number(price) < 0) {
        newErrors.price = "Giá không được âm";
      } else if (price && Number(price) > 100000000) {
        newErrors.price = "Giá không hợp lệ (quá 100 triệu)";
      }

      if (deposit && isNaN(Number(deposit))) {
        newErrors.deposit = "Tiền cọc phải là số";
      } else if (deposit && Number(deposit) < 0) {
        newErrors.deposit = "Tiền cọc không được âm";
      }

      const leaseMonths = remainingLeaseMonths.trim();
      if (!leaseMonths) {
        newErrors.remainingLeaseMonths =
          "Vui lòng nhập số tháng hợp đồng còn lại";
      } else if (isNaN(Number(leaseMonths))) {
        newErrors.remainingLeaseMonths = "Số tháng phải là số";
      } else if (Number(leaseMonths) < 0 || Number(leaseMonths) > 120) {
        newErrors.remainingLeaseMonths = "Số tháng phải từ 0 đến 120";
      }
    } else {
      // Validate Pass Đồ
      if (!title.trim()) {
        newErrors.title = "Vui lòng nhập tên món đồ";
      } else if (title.trim().length < 5) {
        newErrors.title = "Tên món đồ phải có ít nhất 5 ký tự";
      } else if (title.trim().length > 100) {
        newErrors.title = "Tên món đồ không được quá 100 ký tự";
      }

      if (dealType !== "give_away") {
        if (price && isNaN(Number(price))) {
          newErrors.price = "Giá phải là số";
        } else if (price && Number(price) < 0) {
          newErrors.price = "Giá không được âm";
        } else if (price && Number(price) > 100000000) {
          newErrors.price = "Giá không hợp lệ (quá 100 triệu)";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Scroll to first error
  const scrollToError = () => {
    if (scrollRef.current) {
      //@ts-ignore
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Helper render error
  const ErrorText = ({ field }: { field: string }) => {
    if (!errors[field]) return null;
    return (
      <Text style={{ color: themeColors.danger, fontSize: 12, marginTop: -4 }}>
        {errors[field]}
      </Text>
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
        [...prev, ...result.assets].slice(0, 8 - images.length),
      );
    }
  };

  const handleSave = async () => {
    // Validate form
    if (!validateForm()) {
      scrollToError();
      return;
    }

    setSaving(true);
    try {
      // 1. Upload ảnh mới (nếu có)
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
            name: filename.endsWith(`.${ext}`)
              ? filename
              : `${filename}.${ext}`,
            type: mimeType,
          } as any;
        });
        const uploadResult = await uploadImagesApi(files);
        const uploadedUrls = Array.isArray(uploadResult)
          ? uploadResult
          : uploadResult.urls || [];
        finalImages = [...finalImages, ...uploadedUrls];
      }

      // 2. Chuẩn bị payload đúng chuẩn backend
      let payload: any;
      if (isRoom) {
        const leaseMonths = Number(remainingLeaseMonths);

        // Format availableFrom chuẩn YYYY-MM-DD (đã được format từ DatePicker)
        let availDate: string | null = null;
        if (availableFrom.trim()) {
          availDate = availableFrom.trim();
        }

        payload = {
          type: "room",
          title: title.trim(),
          description: description.trim(),
          price: price ? Number(price) : null,
          area: area.trim() || undefined,
          contact: contact.trim() || undefined,
          images: finalImages,
          roomInfo: {
            address: address.trim(),
            deposit: deposit ? Number(deposit) : null,
            remainingLeaseMonths: leaseMonths,
            availableFrom: availDate,
            landlordAgreed: Boolean(landlordAgreed),
            transferTerms: transferTerms.trim() || undefined,
          },
        };
      } else {
        payload = {
          type: "item",
          title: title.trim(),
          description: description.trim(),
          price: dealType === "give_away" ? 0 : price ? Number(price) : null,
          area: area.trim() || undefined,
          contact: contact.trim() || undefined,
          images: finalImages,
          itemInfo: {
            category,
            condition,
            dealType,
          },
        };
      }

      await updatePassApi(initialListing.id || initialListing._id, payload);
      Alert.alert(
        "✅ Đã lưu thay đổi",
        "Bài viết đã được cập nhật và đang chờ quản trị viên duyệt lại. Sau khi được duyệt, thay đổi sẽ hiển thị công khai.",
        [{ text: "Đồng ý", onPress: onSuccess }],
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
        {/* Modal Header */}
        <View style={sModal.header}>
          <Pressable onPress={onClose} style={sModal.headerBtn}>
            <Text style={{ color: themeColors.muted, fontSize: 16 }}>Hủy</Text>
          </Pressable>
          <Text style={sModal.headerTitle}>Chỉnh sửa bài Pass</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={sModal.headerBtn}
          >
            <Text
              style={{
                color: themeColors.primary,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {saving ? "Lưu..." : "Lưu"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          //@ts-ignore
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

          {/* Thông tin chính */}
          <View style={sModal.card}>
            <Text style={sModal.cardTitle}>Thông tin chính</Text>
            <Text style={sModal.label}>Tiêu đề *</Text>
            <TextInput
              style={[
                sModal.input,
                errors.title && {
                  borderColor: themeColors.danger,
                  borderWidth: 1,
                },
              ]}
              value={title}
              onChangeText={(val) => {
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                setTitle(val);
              }}
              placeholder="Tiêu đề bài đăng..."
              placeholderTextColor="#64748b"
            />
            <ErrorText field="title" />

            <Text style={sModal.label}>Mô tả</Text>
            <TextInput
              style={[sModal.input, { height: 90, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả chi tiết..."
              placeholderTextColor="#64748b"
              multiline
            />

            <Text style={sModal.label}>
              {isRoom
                ? "Giá thuê (VNĐ/tháng)"
                : dealType === "give_away"
                  ? "Giá (0đ - Cho tặng)"
                  : "Giá (VNĐ)"}
            </Text>
            <TextInput
              style={[
                sModal.input,
                !isRoom && dealType === "give_away" && { opacity: 0.6 },
                errors.price && {
                  borderColor: themeColors.danger,
                  borderWidth: 1,
                },
              ]}
              value={!isRoom && dealType === "give_away" ? "0" : price}
              onChangeText={(val) => {
                if (errors.price) setErrors((prev) => ({ ...prev, price: "" }));
                setPrice(val);
              }}
              placeholder="Giá (VNĐ)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              editable={isRoom || dealType !== "give_away"}
            />
            <ErrorText field="price" />

            <Text style={sModal.label}>Khu vực</Text>
            <TextInput
              style={sModal.input}
              value={area}
              onChangeText={setArea}
              placeholder="Cầu Giấy, Hà Nội..."
              placeholderTextColor="#64748b"
            />

            <Text style={sModal.label}>Thông tin liên hệ</Text>
            <TextInput
              style={sModal.input}
              value={contact}
              onChangeText={setContact}
              placeholder="SĐT / Zalo: 0900000000"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Nếu là phòng */}
          {isRoom ? (
            <View style={sModal.card}>
              <Text style={sModal.cardTitle}>Thông tin phòng</Text>
              <Text style={sModal.label}>Địa chỉ phòng *</Text>
              <TextInput
                style={[
                  sModal.input,
                  errors.address && {
                    borderColor: themeColors.danger,
                    borderWidth: 1,
                  },
                ]}
                value={address}
                onChangeText={(val) => {
                  if (errors.address)
                    setErrors((prev) => ({ ...prev, address: "" }));
                  setAddress(val);
                }}
                placeholder="Địa chỉ chi tiết..."
                placeholderTextColor="#64748b"
              />
              <ErrorText field="address" />

              <Text style={sModal.label}>Tiền cọc (VNĐ)</Text>
              <TextInput
                style={[
                  sModal.input,
                  errors.deposit && {
                    borderColor: themeColors.danger,
                    borderWidth: 1,
                  },
                ]}
                value={deposit}
                onChangeText={(val) => {
                  if (errors.deposit)
                    setErrors((prev) => ({ ...prev, deposit: "" }));
                  setDeposit(val);
                }}
                keyboardType="numeric"
                placeholder="Tiền cọc..."
                placeholderTextColor="#64748b"
              />
              <ErrorText field="deposit" />

              <Text style={sModal.label}>
                Số tháng hợp đồng còn lại (0 - 120) *
              </Text>
              <TextInput
                style={[
                  sModal.input,
                  errors.remainingLeaseMonths && {
                    borderColor: themeColors.danger,
                    borderWidth: 1,
                  },
                ]}
                value={remainingLeaseMonths}
                onChangeText={(val) => {
                  if (errors.remainingLeaseMonths)
                    setErrors((prev) => ({
                      ...prev,
                      remainingLeaseMonths: "",
                    }));
                  setRemainingLeaseMonths(val);
                }}
                keyboardType="numeric"
                placeholder="VD: 5"
                placeholderTextColor="#64748b"
              />
              <ErrorText field="remainingLeaseMonths" />

              <Text style={sModal.label}>Bàn giao từ ngày</Text>
              <Pressable
                style={sModal.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={{
                    color: availableFrom ? themeColors.text : "#64748b",
                  }}
                >
                  {availableFrom
                    ? new Date(availableFrom).toLocaleDateString("vi-VN")
                    : "Chọn ngày bàn giao"}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={availableFrom ? new Date(availableFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (selectedDate) {
                      const formatted = selectedDate
                        .toISOString()
                        .split("T")[0];
                      setAvailableFrom(formatted);
                    }
                  }}
                />
              )}

              <View style={sModal.switchRow}>
                <Text
                  style={{
                    color: themeColors.text,
                    fontWeight: "600",
                    flex: 1,
                  }}
                >
                  Chủ nhà đã đồng ý cho chuyển nhượng
                </Text>
                <Switch
                  value={landlordAgreed}
                  onValueChange={setLandlordAgreed}
                  trackColor={{ false: "#334155", true: themeColors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <Text style={sModal.label}>Điều khoản chuyển nhượng</Text>
              <TextInput
                style={[sModal.input, { height: 70, textAlignVertical: "top" }]}
                value={transferTerms}
                onChangeText={setTransferTerms}
                placeholder="Điều khoản chuyển nhượng..."
                placeholderTextColor="#64748b"
                multiline
              />
            </View>
          ) : (
            <View style={sModal.card}>
              <Text style={sModal.cardTitle}>Thông tin món đồ</Text>

              <Text style={sModal.label}>Danh mục</Text>
              <View style={sModal.chipWrap}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      sModal.chip,
                      category === opt.key && sModal.chipActive,
                    ]}
                    onPress={() => setCategory(opt.key)}
                  >
                    <Text
                      style={[
                        sModal.chipText,
                        category === opt.key && sModal.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={sModal.label}>Tình trạng</Text>
              <View style={sModal.chipWrap}>
                {CONDITION_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      sModal.chip,
                      condition === opt.key && sModal.chipActive,
                    ]}
                    onPress={() => setCondition(opt.key)}
                  >
                    <Text
                      style={[
                        sModal.chipText,
                        condition === opt.key && sModal.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={sModal.label}>Hình thức</Text>
              <View style={sModal.chipWrap}>
                {DEAL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      sModal.chip,
                      dealType === opt.key && sModal.chipActive,
                    ]}
                    onPress={() => setDealType(opt.key)}
                  >
                    <Text
                      style={[
                        sModal.chipText,
                        dealType === opt.key && sModal.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

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
                <Text style={{ color: themeColors.primary, fontSize: 24 }}>
                  +
                </Text>
                <Text style={{ color: themeColors.muted, fontSize: 11 }}>
                  Thêm ảnh
                </Text>
              </Pressable>

              {/* Ảnh hiện có */}
              {images.map((url, i) => (
                <View key={`exist-${i}`} style={sModal.imgBox}>
                  <Image source={{ uri: url }} style={sModal.img} />
                  <Pressable
                    style={sModal.delBadge}
                    onPress={() =>
                      setImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}

              {/* Ảnh mới chọn */}
              {newImageAssets.map((asset, i) => (
                <View key={`new-${i}`} style={sModal.imgBox}>
                  <Image source={{ uri: asset.uri }} style={sModal.img} />
                  <Pressable
                    style={sModal.delBadge}
                    onPress={() =>
                      setNewImageAssets((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>

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
    color: themeColors.text,
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
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
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
  headerBtn: {
    padding: 4,
  },
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: themeColors.bg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginTop: 6,
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
  img: {
    width: "100%",
    height: "100%",
  },
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
});
