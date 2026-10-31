import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
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
import { updatePassApi } from "../../api/pass";
import { uploadImagesApi } from "../../api/uploads";
import {
  CONDITION_LABELS,
  DEAL_LABELS,
  ITEM_CATEGORY_LABELS,
} from "../../utils/labels";

const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
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

interface EditPassModalInlineProps {
  visible: boolean;
  initialListing: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPassModalInline({
  visible,
  initialListing,
  onClose,
  onSuccess,
}: EditPassModalInlineProps) {
  const isRoom = initialListing.type === "room";
  const room = initialListing.roomInfo || {};
  const item = initialListing.itemInfo || {};
  const scrollRef = useRef<ScrollView | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [title, setTitle] = useState(initialListing.title || "");
  const [description, setDescription] = useState(initialListing.description || "");
  const [price, setPrice] = useState(
    initialListing.price != null ? String(initialListing.price) : "",
  );
  const [area, setArea] = useState(initialListing.area || "");
  const [contact, setContact] = useState(() => {
    // Lấy số điện thoại từ nhiều nguồn có thể, ưu tiên theo thứ tự
    const phone = 
      initialListing.contact ||
      initialListing.contactPhone ||
      initialListing.phone ||
      "";
    return String(phone || "");
  });

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
  const [landlordAgreed, setLandlordAgreed] = useState(Boolean(room.landlordAgreed));
  const [transferTerms, setTransferTerms] = useState(room.transferTerms || "");

  // Item fields
  const [category, setCategory] = useState(item.category || "furniture");
  const [condition, setCondition] = useState(item.condition || "good");
  const [dealType, setDealType] = useState(item.dealType || "sell");

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

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (isRoom) {
      if (!title.trim() || title.trim().length < 10 || title.trim().length > 100) {
        newErrors.title = "Tiêu đề phải từ 10-100 ký tự";
      }
      if (!address.trim()) newErrors.address = "Vui lòng nhập địa chỉ phòng";
      if (price && (isNaN(Number(price)) || Number(price) < 0 || Number(price) > 100000000)) {
        newErrors.price = "Giá không hợp lệ";
      }
      if (deposit && (isNaN(Number(deposit)) || Number(deposit) < 0)) {
        newErrors.deposit = "Tiền cọc không hợp lệ";
      }
      const leaseMonths = remainingLeaseMonths.trim();
      if (!leaseMonths || isNaN(Number(leaseMonths)) || Number(leaseMonths) < 0 || Number(leaseMonths) > 120) {
        newErrors.remainingLeaseMonths = "Số tháng phải từ 0-120";
      }
    } else {
      if (!title.trim() || title.trim().length < 5 || title.trim().length > 100) {
        newErrors.title = "Tên món đồ phải từ 5-100 ký tự";
      }
      if (dealType !== "give_away") {
        if (price && (isNaN(Number(price)) || Number(price) < 0 || Number(price) > 100000000)) {
          newErrors.price = "Giá không hợp lệ";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const scrollToError = () => {
    if (scrollRef.current) {
      // @ts-ignore
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

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
      setNewImageAssets((prev) => [...prev, ...result.assets].slice(0, 8 - images.length));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      scrollToError();
      return;
    }

    setSaving(true);
    try {
      // 1. Upload ảnh mới
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
            ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
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

      // 2. Chuẩn bị payload
      let payload: any;
      if (isRoom) {
        const leaseMonths = Number(remainingLeaseMonths);
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
        "Đã lưu thay đổi",
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
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.headerBtn}>
            <Text style={{ color: themeColors.muted, fontSize: 16 }}>Hủy</Text>
          </Pressable>
          <Text style={s.headerTitle}>Chỉnh sửa bài Pass</Text>
          <Pressable onPress={handleSave} disabled={saving} style={s.headerBtn}>
            <Text style={{ color: themeColors.primary, fontSize: 16, fontWeight: "700" }}>
              {saving ? "Lưu..." : "Lưu"}
            </Text>
          </Pressable>
        </View>

        {/* @ts-ignore */}
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
          {/* Thông báo */}
          <View style={s.noticeBox}>
            <Text style={s.noticeText}>
              ℹ️ <Text style={{ fontWeight: "700" }}>Lưu ý:</Text> Mọi chỉnh sửa cần được quản trị viên duyệt lại trước khi hiển thị công khai.
            </Text>
          </View>

          {/* Thông tin chính */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Thông tin chính</Text>
            <Text style={s.label}>Tiêu đề *</Text>
            <TextInput
              style={[s.input, errors.title && { borderColor: themeColors.danger, borderWidth: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Tiêu đề bài đăng..."
              placeholderTextColor="#64748b"
            />
            <ErrorText field="title" />

            <Text style={s.label}>Mô tả</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả chi tiết..."
              placeholderTextColor="#64748b"
              multiline
            />

            <Text style={s.label}>{isRoom ? "Giá thuê (VNĐ/tháng)" : "Giá (VNĐ)"}</Text>
            <TextInput
              style={[s.input, errors.price && { borderColor: themeColors.danger, borderWidth: 1 }]}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              editable={isRoom || dealType !== "give_away"}
            />
            <ErrorText field="price" />

            <Text style={s.label}>Khu vực</Text>
            <TextInput
              style={s.input}
              value={area}
              onChangeText={setArea}
              placeholder="Cầu Giấy, Hà Nội..."
              placeholderTextColor="#64748b"
            />

            <Text style={s.label}>Số điện thoại</Text>
            <TextInput
              style={s.input}
              value={contact}
              onChangeText={setContact}
              placeholder="SĐT / Zalo"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Room specific fields */}
          {isRoom && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin phòng</Text>
              <Text style={s.label}>Địa chỉ phòng *</Text>
              <TextInput
                style={[s.input, errors.address && { borderColor: themeColors.danger, borderWidth: 1 }]}
                value={address}
                onChangeText={setAddress}
              />
              <ErrorText field="address" />

              <Text style={s.label}>Tiền cọc (VNĐ)</Text>
              <TextInput
                style={s.input}
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="numeric"
              />

              <Text style={s.label}>Số tháng hợp đồng còn lại *</Text>
              <TextInput
                style={[s.input, errors.remainingLeaseMonths && { borderColor: themeColors.danger, borderWidth: 1 }]}
                value={remainingLeaseMonths}
                onChangeText={setRemainingLeaseMonths}
                keyboardType="numeric"
              />
              <ErrorText field="remainingLeaseMonths" />

              <Text style={s.label}>Bàn giao từ ngày</Text>
              <Pressable style={s.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: availableFrom ? themeColors.text : themeColors.muted }}>
                  {availableFrom || "Chọn ngày"}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={availableFrom ? new Date(availableFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (event.type === "set" && selectedDate) {
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
                      const day = String(selectedDate.getDate()).padStart(2, "0");
                      setAvailableFrom(`${year}-${month}-${day}`);
                    }
                  }}
                />
              )}

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                <Switch value={landlordAgreed} onValueChange={setLandlordAgreed} />
                <Text style={{ color: themeColors.text, marginLeft: 12 }}>Chủ nhà đồng ý</Text>
              </View>

              <Text style={s.label}>Điều khoản chuyển nhượng</Text>
              <TextInput
                style={[s.input, { height: 70, textAlignVertical: "top" }]}
                value={transferTerms}
                onChangeText={setTransferTerms}
                multiline
              />
            </View>
          )}

          {/* Item specific fields */}
          {!isRoom && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Thông tin đồ</Text>
              <Text style={s.label}>Danh mục</Text>
              <View style={s.chipRow}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.chip, category === opt.key && s.chipActive]}
                    onPress={() => setCategory(opt.key)}
                  >
                    <Text style={[s.chipText, category === opt.key && s.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.label}>Tình trạng</Text>
              <View style={s.chipRow}>
                {CONDITION_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.chip, condition === opt.key && s.chipActive]}
                    onPress={() => setCondition(opt.key)}
                  >
                    <Text style={[s.chipText, condition === opt.key && s.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.label}>Hình thức</Text>
              <View style={s.chipRow}>
                {DEAL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.chip, dealType === opt.key && s.chipActive]}
                    onPress={() => setDealType(opt.key)}
                  >
                    <Text style={[s.chipText, dealType === opt.key && s.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Images */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Hình ảnh ({images.length + newImageAssets.length}/8)</Text>
            <Pressable style={s.addImageBtn} onPress={pickMoreImages}>
              <Text style={s.addImageBtnText}>+ Thêm ảnh</Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              {images.map((url, idx) => (
                <View key={`existing-${idx}`} style={s.imageWrapper}>
                  <Image source={{ uri: url }} style={s.thumbnail} />
                  <Pressable
                    style={s.removeImageBtn}
                    onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={s.removeImageText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {newImageAssets.map((asset, idx) => (
                <View key={`new-${asset.uri}-${idx}`} style={s.imageWrapper}>
                  <Image source={{ uri: asset.uri }} style={s.thumbnail} />
                  <Pressable
                    style={s.removeImageBtn}
                    onPress={() => setNewImageAssets((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={s.removeImageText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Button Lưu thay đổi ở cuối form */}
          <Pressable
            style={[s.saveButton, saving && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={saving ? "Đang lưu thay đổi" : "Lưu thay đổi"}
          >
            <Text style={s.saveButtonText}>
              {saving ? " Đang lưu..." : "Lưu thay đổi"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    backgroundColor: themeColors.card,
  },
  headerBtn: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: themeColors.text,
  },
  noticeBox: {
    backgroundColor: "#1e3a8a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  noticeText: {
    color: "#93c5fd",
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: themeColors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColors.text,
    marginTop: 4,
  },
  input: {
    minHeight: 48,
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: themeColors.text,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  chipActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  chipText: {
    fontSize: 13,
    color: themeColors.text,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  addImageBtn: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addImageBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  imageWrapper: {
    position: "relative",
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: themeColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: themeColors.muted,
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
