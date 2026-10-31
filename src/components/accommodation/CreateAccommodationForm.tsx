import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { createAccommodationApi, updateAccommodationApi } from "../../api/accommodations";
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

interface CreateAccommodationFormProps {
  onSuccess: () => void;
  initialData?: any;
  initialContact?: string;
  accommodationId?: string;
  mode?: "create" | "edit";
}

export function CreateAccommodationForm({ 
  onSuccess, 
  initialData, 
  initialContact,
  accommodationId,
  mode = "create" 
}: CreateAccommodationFormProps) {
  // Parse initial data if in edit mode
  const getInitialValues = (): AccommodationFormValues => {
    if (mode === "edit" && initialData) {
      const addr = typeof initialData.address === "object" ? initialData.address : {};
      const costs = initialData.extraCosts || {};
      
      return {
        title: initialData.title || "",
        price: initialData.price != null ? String(initialData.price) : "",
        deposit: initialData.deposit != null ? String(initialData.deposit) : "",
        description: initialData.description || "",
        address: typeof initialData.address === "string" ? initialData.address : "",
        city: addr.city || "",
        district: addr.district || "",
        ward: addr.ward || "",
        street: addr.street || "",
        roomType: initialData.roomType || "single",
        area: initialData.area != null ? String(initialData.area) : "",
        maxOccupants: initialData.maxOccupants != null ? String(initialData.maxOccupants) : "",
        availableFrom: initialData.availableFrom ? initialData.availableFrom.slice(0, 10) : "",
        electricity: costs.electricity != null ? String(costs.electricity) : "",
        water: costs.water != null ? String(costs.water) : "",
        internet: costs.internet != null ? String(costs.internet) : "",
        otherCost: costs.other || "",
        amenities: Array.isArray(initialData.amenities) ? initialData.amenities : [],
        rentalTerms: initialData.rentalTerms || "",
        contact: initialData.contactPhone
          || initialData.contact
          || initialData.phone
          || initialContact
          || "",
        images: Array.isArray(initialData.images) ? initialData.images : [],
      };
    }
    return {
      ...EMPTY_ACCOMMODATION_FORM,
      roomType: "single",
    };
  };

  const [values, setValues] = useState<AccommodationFormValues>(getInitialValues());
  const [imageAssets, setImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  // Normalize: API có thể trả về string[] hoặc { url: string }[]
  const normalizeImageUrls = (raw: any[]): string[] =>
    (raw || []).map((img: any) => {
      if (typeof img === "string") return img;
      if (img && typeof img === "object") return img.url || img.uri || img.src || "";
      return "";
    }).filter(Boolean);

  const [existingImages, setExistingImages] = useState<string[]>(
    mode === "edit" && initialData?.images
      ? normalizeImageUrls(initialData.images)
      : []
  );
  const [errors, setErrors] = useState<AccommodationFormErrors>({});
  const [imageError, setImageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const scrollRef = useRef<any>(null);
  const bottom = useBottomPad(28);

  // Lưu vị trí Y của các trường để scroll đến trường có lỗi
  const fieldPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const updateField = (field: keyof AccommodationFormValues, value: any) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    // Không xóa lỗi khi nhập, để hiển thị tất cả lỗi cùng lúc
    // Lỗi chỉ được xóa khi submit lại và validation pass
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
    const totalImages = existingImages.length + imageAssets.length;
    if (totalImages >= 8) {
      Alert.alert("Giới hạn", "Bạn chỉ được chọn tối đa 8 hình ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8 - totalImages,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setImageAssets((prev) => [...prev, ...result.assets].slice(0, 8 - existingImages.length));
    }
  };

  const removeImage = (index: number) => {
    setImageAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (submitting.current) return;
    
    // Validate hình ảnh trước
    const totalImages = existingImages.length + imageAssets.length;
    if (totalImages === 0) {
      setImageError("Vui lòng thêm ít nhất 1 hình ảnh phòng.");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setImageError("");
    
    const validation = validateAccommodationForm(values);
    
    setErrors(validation);
    setSubmitError("");
    
    if (Object.keys(validation).length) {
      // Tìm trường đầu tiên có lỗi và scroll đến đó
      const errorFields = Object.keys(validation);
      const firstErrorField = errorFields[0];
      
      setTimeout(() => {
        const yPosition = fieldPositions.current[firstErrorField];
        if (yPosition !== undefined && yPosition > 0) {
          // Scroll đến vị trí trường lỗi, trừ đi 100px để hiển thị label
          scrollRef.current?.scrollTo({ y: Math.max(0, yPosition - 100), animated: true });
        } else {
          // Fallback: scroll về đầu nếu không tìm thấy vị trí
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
      }, 100);
      return;
    }

    submitting.current = true;
    setSaving(true);
    Keyboard.dismiss();

    try {
      let uploadedUrls: string[] = [...existingImages];
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
        const newUploadedUrls = Array.isArray(uploadResult)
          ? uploadResult
          : uploadResult.urls || [];
        uploadedUrls = [...uploadedUrls, ...newUploadedUrls];
      }

      const payload = buildAccommodationPayload({
        ...values,
        images: uploadedUrls.length > 0 ? uploadedUrls : values.images,
      });

      if (mode === "edit" && accommodationId) {
        await updateAccommodationApi(accommodationId, payload);
        Alert.alert(
          "✅ Đã lưu thay đổi",
          "Bài viết đã được cập nhật và đang chờ quản trị viên duyệt lại. Sau khi được duyệt, thay đổi sẽ hiển thị công khai.",
          [{ text: "Đồng ý" }]
        );
      } else {
        await createAccommodationApi(payload);
        Alert.alert(
          "✅ Đã gửi bài đăng",
          "Bài viết của bạn đang chờ quản trị viên duyệt. Sau khi được duyệt, bài viết sẽ hiển thị công khai.\n\nBạn có thể xem trạng thái ở tab 'Tin của tôi'.",
          [{ text: "Đồng ý" }]
        );
      }
      
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
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={s.intro}>
          <Text style={s.title}>
            {mode === "edit" ? "Chỉnh sửa bài đăng" : "Đăng tin cho thuê phòng"}
          </Text>
          <Text style={s.hint}>
            {mode === "edit" 
              ? "Chỉnh sửa thông tin phòng. Các mục có dấu * là bắt buộc."
              : "Điền thông tin phòng. Các mục có dấu * là bắt buộc."}
          </Text>
          <View style={{ backgroundColor: "#1e3a8a", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#3b82f6", marginTop: 8 }}>
            <Text style={{ color: "#93c5fd", fontSize: 13, lineHeight: 20 }}>
              ℹ️ <Text style={{ fontWeight: "700" }}>Lưu ý:</Text> {mode === "edit" 
                ? "Mọi chỉnh sửa cần được quản trị viên duyệt lại trước khi hiển thị công khai."
                : "Tất cả bài đăng cần được quản trị viên duyệt trước khi hiển thị công khai. Bạn có thể xem trạng thái ở tab 'Tin của tôi'."}
            </Text>
          </View>
        </View>

        {/* 1. Hình ảnh phòng */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              Hình ảnh phòng ({existingImages.length + imageAssets.length}/8) *
            </Text>
            <Pressable
              accessibilityRole="button"
              style={s.pickBtn}
              onPress={pickImages}
              disabled={saving}
            >
              <Text style={s.pickBtnText}>+ Thêm ảnh</Text>
            </Pressable>
          </View>
          {imageError && <Text accessibilityRole="alert" style={s.error}>{imageError}</Text>}
          {(existingImages.length > 0 || imageAssets.length > 0) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imageRow}>
              {/* Ảnh hiện có */}
              {existingImages.map((url, idx) => (
                <View key={`existing-${idx}`} style={s.imageWrapper}>
                  <Image source={{ uri: url }} style={s.thumbnail} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xóa ảnh"
                    style={s.removeImageBtn}
                    onPress={() => removeExistingImage(idx)}
                    disabled={saving}
                  >
                    <Text style={s.removeImageText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {/* Ảnh mới chọn */}
              {imageAssets.map((asset, idx) => (
                <View key={`new-${asset.uri}-${idx}`} style={s.imageWrapper}>
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

          <View onLayout={(e) => (fieldPositions.current.title = e.nativeEvent.layout.y)}>
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
              returnKeyType="next"
            />
            {!!errors.title && <Text accessibilityRole="alert" style={s.error}>{errors.title}</Text>}
          </View>

          <View onLayout={(e) => (fieldPositions.current.price = e.nativeEvent.layout.y)}>
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
          </View>

          <View onLayout={(e) => (fieldPositions.current.deposit = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Tiền cọc (VNĐ) *</Text>
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
          </View>

          <View onLayout={(e) => (fieldPositions.current.description = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Mô tả phòng *</Text>
            <TextInput
              accessibilityLabel="Mô tả phòng"
              style={[s.input, s.description, !!errors.description && s.invalid]}
              placeholder="Phòng trọ Hoà Lạc, gần trường đại học FPT, thoáng mát... (tối thiểu 20 ký tự)"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              value={values.description}
              onChangeText={(value) => updateField("description", value)}
              editable={!saving}
            />
            {!!errors.description && <Text accessibilityRole="alert" style={s.error}>{errors.description}</Text>}
          </View>
        </View>

        {/* 3. Địa chỉ phòng */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Địa chỉ phòng</Text>

          <View onLayout={(e) => (fieldPositions.current.city = e.nativeEvent.layout.y)}>
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
          </View>

          <View onLayout={(e) => (fieldPositions.current.district = e.nativeEvent.layout.y)}>
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
          </View>

          <View onLayout={(e) => (fieldPositions.current.ward = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Phường / Xã *</Text>
            <TextInput
              accessibilityLabel="Phường hoặc Xã"
              style={[s.input, !!errors.ward && s.invalid]}
              placeholder="Ví dụ: Phú Hữu, Dịch Vọng..."
              placeholderTextColor={colors.muted}
              value={values.ward}
              onChangeText={(value) => updateField("ward", value)}
              editable={!saving}
            />
            {!!errors.ward && <Text accessibilityRole="alert" style={s.error}>{errors.ward}</Text>}
          </View>

          <View onLayout={(e) => (fieldPositions.current.street = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Số nhà, ngõ ngách, tên đường *</Text>
            <TextInput
              accessibilityLabel="Số nhà, đường"
              style={[s.input, !!errors.street && s.invalid]}
              placeholder="Ví dụ: 99 hoặc Số 12, Ngõ 1"
              placeholderTextColor={colors.muted}
              value={values.street}
              onChangeText={(value) => updateField("street", value)}
              editable={!saving}
            />
            {!!errors.street && <Text accessibilityRole="alert" style={s.error}>{errors.street}</Text>}
          </View>
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
            <View style={s.col} onLayout={(e) => (fieldPositions.current.area = e.nativeEvent.layout.y)}>
              <Text style={s.label}>Diện tích (m²) *</Text>
              <TextInput
                style={[s.input, !!errors.area && s.invalid]}
                placeholder="Ví dụ: 25"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.area}
                onChangeText={(value) => updateField("area", value)}
                editable={!saving}
              />
              {!!errors.area && <Text accessibilityRole="alert" style={s.error}>{errors.area}</Text>}
            </View>
            <View style={s.col} onLayout={(e) => (fieldPositions.current.maxOccupants = e.nativeEvent.layout.y)}>
              <Text style={s.label}>Số người tối đa *</Text>
              <TextInput
                style={[s.input, !!errors.maxOccupants && s.invalid]}
                placeholder="Ví dụ: 2"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.maxOccupants}
                onChangeText={(value) => updateField("maxOccupants", value)}
                editable={!saving}
              />
              {!!errors.maxOccupants && <Text accessibilityRole="alert" style={s.error}>{errors.maxOccupants}</Text>}
            </View>
          </View>

          <View onLayout={(e) => (fieldPositions.current.availableFrom = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Có thể dọn vào *</Text>
            <Pressable
              accessibilityRole="button"
              style={[s.input, !!errors.availableFrom && s.invalid]}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
            >
              <Text style={{ color: values.availableFrom ? colors.text : colors.muted, fontSize: 15 }}>
                {values.availableFrom || "Chọn ngày có thể dọn vào"}
              </Text>
            </Pressable>
            {!!errors.availableFrom && <Text accessibilityRole="alert" style={s.error}>{errors.availableFrom}</Text>}
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={values.availableFrom ? new Date(values.availableFrom) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === "ios");
                if (event.type === "set" && selectedDate) {
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
                  const day = String(selectedDate.getDate()).padStart(2, "0");
                  updateField("availableFrom", `${year}-${month}-${day}`);
                }
              }}
            />
          )}
        </View>

        {/* 5. Chi phí hàng tháng */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Chi phí dịch vụ</Text>

          <View style={s.twoCols}>
            <View style={s.col} onLayout={(e) => (fieldPositions.current.electricity = e.nativeEvent.layout.y)}>
              <Text style={s.label}>Giá điện (đ/kWh) *</Text>
              <TextInput
                style={[s.input, !!errors.electricity && s.invalid]}
                placeholder="Ví dụ: 3.200"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.electricity}
                onChangeText={(value) => updateField("electricity", value)}
                editable={!saving}
              />
              {!!errors.electricity && <Text accessibilityRole="alert" style={s.error}>{errors.electricity}</Text>}
            </View>
            <View style={s.col} onLayout={(e) => (fieldPositions.current.water = e.nativeEvent.layout.y)}>
              <Text style={s.label}>Giá nước (đ/tháng) *</Text>
              <TextInput
                style={[s.input, !!errors.water && s.invalid]}
                placeholder="Ví dụ: 5.000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.water}
                onChangeText={(value) => updateField("water", value)}
                editable={!saving}
              />
              {!!errors.water && <Text accessibilityRole="alert" style={s.error}>{errors.water}</Text>}
            </View>
          </View>

          <View style={s.twoCols}>
            <View style={s.col} onLayout={(e) => (fieldPositions.current.internet = e.nativeEvent.layout.y)}>
              <Text style={s.label}>Internet (đ/tháng) *</Text>
              <TextInput
                style={[s.input, !!errors.internet && s.invalid]}
                placeholder="Ví dụ: 100.000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={values.internet}
                onChangeText={(value) => updateField("internet", value)}
                editable={!saving}
              />
              {!!errors.internet && <Text accessibilityRole="alert" style={s.error}>{errors.internet}</Text>}
            </View>
            <View style={s.col}>
              <Text style={s.label}>Chi phí khác</Text>
              <TextInput
                style={s.input}
                placeholder="Ví dụ: 250000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
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

          <View onLayout={(e) => (fieldPositions.current.rentalTerms = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Điều khoản thuê *</Text>
            <TextInput
              style={[s.input, !!errors.rentalTerms && s.invalid]}
              placeholder="Ví dụ: Gọn gàng, sạch sẽ, không ồn ào..."
              placeholderTextColor={colors.muted}
              value={values.rentalTerms}
              onChangeText={(value) => updateField("rentalTerms", value)}
              editable={!saving}
            />
            {!!errors.rentalTerms && <Text accessibilityRole="alert" style={s.error}>{errors.rentalTerms}</Text>}
          </View>

          <View onLayout={(e) => (fieldPositions.current.contact = e.nativeEvent.layout.y)}>
            <Text style={s.label}>Số điện thoại liên hệ *</Text>
            <TextInput
              accessibilityLabel="Số điện thoại liên hệ"
              style={[s.input, !!errors.contact && s.invalid]}
              placeholder="Ví dụ: 0922229999"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              value={values.contact}
              onChangeText={(value) => updateField("contact", value)}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
            {!!errors.contact && <Text accessibilityRole="alert" style={s.error}>{errors.contact}</Text>}
          </View>
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
          accessibilityLabel={saving ? (mode === "edit" ? "Đang lưu thay đổi" : "Đang đăng tin") : (mode === "edit" ? "Lưu thay đổi" : "Đăng tin phòng")}
          accessibilityState={{ disabled: saving, busy: saving }}
          style={[s.submit, saving && s.disabled]}
          disabled={saving}
          onPress={submit}
        >
          {saving && <ActivityIndicator color="#fff" size="small" />}
          <Text style={s.submitText}>
            {saving ? (mode === "edit" ? "Đang lưu thay đổi..." : "Đang đăng tin...") : (mode === "edit" ? "Lưu thay đổi" : "Đăng tin phòng")}
          </Text>
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
