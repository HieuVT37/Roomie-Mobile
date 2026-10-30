import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createAccommodationApi } from "../../api/accommodations";
import { uploadImagesApi } from "../../api/uploads";
import {
  accommodationErrorMessage,
  buildAccommodationPayload,
  EMPTY_ACCOMMODATION_FORM,
  validateAccommodationForm,
  type AccommodationFormErrors,
  type AccommodationFormValues,
} from "../../utils/accommodation-form";
import { AMENITIES, ROOM_TYPE_LABELS } from "../../utils/labels";
import { colors, KeyboardScreen, useBottomPad } from "../ui";

const POPULAR_DISTRICTS = [
  "Thạch Thất",
  "Cầu Giấy",
  "Nam Từ Liêm",
  "Bắc Từ Liêm",
  "Đống Đa",
  "Thanh Xuân",
  "Hai Bà Trưng",
  "Hà Đông",
];

export function CreateAccommodationForm({ onSuccess }: { onSuccess: () => void }) {
  const [values, setValues] = useState<AccommodationFormValues>({
    ...EMPTY_ACCOMMODATION_FORM,
    city: "Hà Nội",
    roomType: "single",
  });
  const [imageAssets, setImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [errors, setErrors] = useState<AccommodationFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const bottom = useBottomPad(28);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const updateField = (field: keyof AccommodationFormValues, value: any) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setSubmitError("");
  };

  const toggleAmenity = (name: string) => {
    setValues((previous) => {
      const current = Array.isArray(previous.amenities) ? previous.amenities : [];
      const next = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name];
      return { ...previous, amenities: next };
    });
  };

  const pickImages = async () => {
    if (imageAssets.length >= 8) {
      Alert.alert("Giới hạn", "Bạn chỉ được chọn tối đa 8 hình ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8 - imageAssets.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setImageAssets((prev) => [...prev, ...result.assets].slice(0, 8));
    }
  };

  const removeImage = (index: number) => {
    setImageAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (submitting.current) return;
    const validation = validateAccommodationForm(values);
    setErrors(validation);
    setSubmitError("");
    if (Object.keys(validation).length) return;

    submitting.current = true;
    setSaving(true);
    Keyboard.dismiss();

    try {
      let uploadedUrls: string[] = [];
      const currentImages = typeof imageAssets !== "undefined" ? imageAssets : [];
      const uploader = typeof uploadImagesApi !== "undefined" ? uploadImagesApi : null;

      if (currentImages.length > 0 && uploader) {
        const files = currentImages.map((asset, index) => {
          const filename =
            asset.fileName ||
            asset.uri.split("/").pop() ||
            `room_${Date.now()}_${index}.jpg`;
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
        const uploadResult = await uploader(files);
        uploadedUrls = Array.isArray(uploadResult)
          ? uploadResult
          : uploadResult.urls || [];
      }

      const payload = buildAccommodationPayload({
        ...values,
        images: uploadedUrls.length > 0 ? uploadedUrls : values.images,
      });

      await createAccommodationApi(payload);
      if (mounted.current) onSuccess();
    } catch (error: unknown) {
      if (mounted.current) setSubmitError(accommodationErrorMessage(error));
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <KeyboardScreen>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={s.intro}>
          <Text style={s.title}>Đăng tin cho thuê phòng</Text>
          <Text style={s.hint}>Điền thông tin phòng. Các mục có dấu * là bắt buộc.</Text>
        </View>

        {/* 1. Hình ảnh phòng */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Hình ảnh phòng ({imageAssets.length}/8)</Text>
            <Pressable
              accessibilityRole="button"
              style={s.pickBtn}
              onPress={pickImages}
              disabled={saving}
            >
              <Text style={s.pickBtnText}>+ Thêm ảnh</Text>
            </Pressable>
          </View>
          {imageAssets.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imageRow}>
              {imageAssets.map((asset, idx) => (
                <View key={`${asset.uri}-${idx}`} style={s.imageWrapper}>
                  <Image source={{ uri: asset.uri }} style={s.thumbnail} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xóa ảnh"
                    style={s.removeImageBtn}
                    onPress={() => removeImage(idx)}
                    disabled={saving}
                  >
                    <Text style={s.removeImageText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Pressable style={s.emptyImageBox} onPress={pickImages} disabled={saving}>
              <Text style={{ fontSize: 32, marginBottom: 4 }}>🏠</Text>
              <Text style={s.hint}>Chưa có hình ảnh. Bấm để chọn ảnh từ máy.</Text>
            </Pressable>
          )}
        </View>

        {/* 2. Thông tin cơ bản */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Thông tin cơ bản</Text>

          <Text style={s.label}>Tiêu đề bài đăng *</Text>
          <TextInput
            accessibilityLabel="Tiêu đề bài đăng, bắt buộc"
            style={[s.input, !!errors.title && s.invalid]}
            placeholder="Ví dụ: Phòng trọ Hoà Lạc khép kín"
            placeholderTextColor={colors.muted}
            value={values.title}
            onChangeText={(value) => updateField("title", value)}
            editable={!saving}
            autoCapitalize="sentences"
          />
          {!!errors.title && <Text accessibilityRole="alert" style={s.error}>{errors.title}</Text>}

          <Text style={s.label}>Giá thuê mỗi tháng (VNĐ) *</Text>
          <TextInput
            accessibilityLabel="Giá thuê mỗi tháng"
            style={[s.input, !!errors.price && s.invalid]}
            placeholder="Ví dụ: 3.000.000 hoặc 3000000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            value={values.price}
            onChangeText={(value) => updateField("price", value)}
            editable={!saving}
          />
          {!!errors.price && <Text accessibilityRole="alert" style={s.error}>{errors.price}</Text>}

          <Text style={s.label}>Tiền cọc (VNĐ)</Text>
          <TextInput
            accessibilityLabel="Tiền cọc"
            style={[s.input, !!errors.deposit && s.invalid]}
            placeholder="Ví dụ: 500.000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            value={values.deposit}
            onChangeText={(value) => updateField("deposit", value)}
            editable={!saving}
          />
          {!!errors.deposit && <Text accessibilityRole="alert" style={s.error}>{errors.deposit}</Text>}

          <Text style={s.label}>Mô tả phòng</Text>
          <TextInput
            accessibilityLabel="Mô tả phòng"
            style={[s.input, s.description]}
            placeholder="Phòng trọ Hoà Lạc, gần trường đại học FPT, thoáng mát..."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            value={values.description}
            onChangeText={(value) => updateField("description", value)}
            editable={!saving}
          />
        </View>

        {/* 3. Địa chỉ phòng */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Địa chỉ phòng</Text>

          <Text style={s.label}>Tỉnh / Thành phố *</Text>
          <TextInput
            accessibilityLabel="Tỉnh hoặc Thành phố"
            style={[s.input, !!errors.city && s.invalid]}
            placeholder="Ví dụ: Hà Nội"
            placeholderTextColor={colors.muted}
            value={values.city}
            onChangeText={(value) => updateField("city", value)}
            editable={!saving}
          />
          {!!errors.city && <Text accessibilityRole="alert" style={s.error}>{errors.city}</Text>}

          <Text style={s.label}>Quận / Huyện *</Text>
          <TextInput
            accessibilityLabel="Quận hoặc Huyện"
            style={[s.input, !!errors.district && s.invalid]}
            placeholder="Ví dụ: Thạch Thất, Cầu Giấy..."
            placeholderTextColor={colors.muted}
            value={values.district}
            onChangeText={(value) => updateField("district", value)}
            editable={!saving}
          />
          {!!errors.district && <Text accessibilityRole="alert" style={s.error}>{errors.district}</Text>}

          <View style={s.chipWrap}>
            {POPULAR_DISTRICTS.map((dist) => (
              <Pressable
                key={dist}
                style={[s.chip, values.district === dist && s.chipSelected]}
                onPress={() => updateField("district", dist)}
                disabled={saving}
              >
                <Text style={[s.chipText, values.district === dist && s.chipTextSelected]}>
                  {dist}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Phường / Xã</Text>
          <TextInput
            accessibilityLabel="Phường hoặc Xã"
            style={s.input}
            placeholder="Ví dụ: Phú Hữu, Dịch Vọng..."
            placeholderTextColor={colors.muted}
            value={values.ward}
            onChangeText={(value) => updateField("ward", value)}
            editable={!saving}
          />

          <Text style={s.label}>Số nhà, ngõ ngách, tên đường</Text>
          <TextInput
            accessibilityLabel="Số nhà, đường"
            style={s.input}
            placeholder="Ví dụ: 99 hoặc Số 12, Ngõ 1"
            placeholderTextColor={colors.muted}
            value={values.street}
            onChangeText={(value) => updateField("street", value)}
            editable={!saving}
          />
        </View>

        {/* 4. Thông tin chi tiết */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Thông tin chi tiết</Text>

          <Text style={s.label}>Loại phòng *</Text>
          <View style={s.chipWrap}>
            {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => (
              <Pressable
                key={key}
                style={[s.chip, values.roomType === key && s.chipSelected]}
                onPress={() => updateField("roomType", key)}
                disabled={saving}
              >
                <Text style={[s.chipText, values.roomType === key && s.chipTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.twoCols}>
            <View style={s.col}>
              <Text style={s.label}>Diện tích (m²)</Text>
              <TextInput
                style={s.input}
                placeholder="Ví dụ: 25"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.area}
                onChangeText={(value) => updateField("area", value)}
                editable={!saving}
              />
            </View>
            <View style={s.col}>
              <Text style={s.label}>Số người tối đa</Text>
              <TextInput
                style={s.input}
                placeholder="Ví dụ: 2"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.maxOccupants}
                onChangeText={(value) => updateField("maxOccupants", value)}
                editable={!saving}
              />
            </View>
          </View>

          <Text style={s.label}>Có thể dọn vào</Text>
          <TextInput
            style={s.input}
            placeholder="Ví dụ: 20/11/2026 hoặc hôm nay"
            placeholderTextColor={colors.muted}
            value={values.availableFrom}
            onChangeText={(value) => updateField("availableFrom", value)}
            editable={!saving}
          />
        </View>

        {/* 5. Chi phí hàng tháng */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Chi phí dịch vụ</Text>

          <View style={s.twoCols}>
            <View style={s.col}>
              <Text style={s.label}>Giá điện (đ/kWh)</Text>
              <TextInput
                style={[s.input, !!errors.electricity && s.invalid]}
                placeholder="Ví dụ: 3.200"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.electricity}
                onChangeText={(value) => updateField("electricity", value)}
                editable={!saving}
              />
            </View>
            <View style={s.col}>
              <Text style={s.label}>Giá nước (đ)</Text>
              <TextInput
                style={[s.input, !!errors.water && s.invalid]}
                placeholder="Ví dụ: 5.000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.water}
                onChangeText={(value) => updateField("water", value)}
                editable={!saving}
              />
            </View>
          </View>

          <View style={s.twoCols}>
            <View style={s.col}>
              <Text style={s.label}>Internet (đ/tháng)</Text>
              <TextInput
                style={[s.input, !!errors.internet && s.invalid]}
                placeholder="Ví dụ: 100.000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.internet}
                onChangeText={(value) => updateField("internet", value)}
                editable={!saving}
              />
            </View>
            <View style={s.col}>
              <Text style={s.label}>Chi phí khác</Text>
              <TextInput
                style={s.input}
                placeholder="Ví dụ: 250000"
                placeholderTextColor={colors.muted}
                value={values.otherCost}
                onChangeText={(value) => updateField("otherCost", value)}
                editable={!saving}
              />
            </View>
          </View>
        </View>

        {/* 6. Tiện nghi */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Tiện nghi phòng</Text>
          <Text style={s.hint}>Bấm để chọn tiện nghi có sẵn trong phòng.</Text>
          <View style={s.chipWrap}>
            {AMENITIES.map((item) => {
              const selected = values.amenities?.includes(item);
              return (
                <Pressable
                  key={item}
                  style={[s.chip, selected && s.chipSelected]}
                  onPress={() => toggleAmenity(item)}
                  disabled={saving}
                >
                  <Text style={[s.chipText, selected && s.chipTextSelected]}>
                    {selected ? `✓ ${item}` : item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 7. Điều khoản & Liên hệ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Điều khoản & Liên hệ</Text>

          <Text style={s.label}>Điều khoản thuê</Text>
          <TextInput
            style={s.input}
            placeholder="Ví dụ: Gọn gàng, sạch sẽ, không ồn ào..."
            placeholderTextColor={colors.muted}
            value={values.rentalTerms}
            onChangeText={(value) => updateField("rentalTerms", value)}
            editable={!saving}
          />

          <Text style={s.label}>Số điện thoại liên hệ</Text>
          <TextInput
            accessibilityLabel="Số điện thoại liên hệ"
            style={s.input}
            placeholder="Ví dụ: 0922229999"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            value={values.contact}
            onChangeText={(value) => updateField("contact", value)}
            editable={!saving}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>

        {/* Thông báo lỗi */}
        {!!submitError && (
          <View accessibilityRole="alert" style={s.errorBox}>
            <Text style={s.error}>{submitError}</Text>
            <Text style={s.hint}>Thông tin đã nhập vẫn được giữ lại để bạn thử lại.</Text>
          </View>
        )}

        {/* Nút gửi */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saving ? "Đang đăng tin" : "Đăng tin phòng"}
          accessibilityState={{ disabled: saving, busy: saving }}
          style={[s.submit, saving && s.disabled]}
          disabled={saving}
          onPress={submit}
        >
          {saving && <ActivityIndicator color="#fff" size="small" />}
          <Text style={s.submitText}>{saving ? "Đang đăng tin..." : "Đăng tin phòng"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardScreen>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16 },
  intro: { gap: 6 },
  title: { fontSize: 21, fontWeight: "700", color: colors.text },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: {
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 4 },
  input: {
    minHeight: 48,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  description: { minHeight: 90 },
  twoCols: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  invalid: { borderColor: colors.danger },
  error: { color: "#fca5a5", fontSize: 13, lineHeight: 20 },
  errorBox: {
    padding: 14,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.card,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  pickBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pickBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  imageRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
  },
  imageWrapper: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 14,
  },
  emptyImageBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  submit: {
    minHeight: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.65 },
});
