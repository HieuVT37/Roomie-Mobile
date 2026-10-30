import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import api, { imageUrl } from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { uploadImageToFirebase } from "../../firebase/storage";

export default function EditProfileScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Thông tin cơ bản
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("Nam");
  const [birthYear, setBirthYear] = useState("");
  const [school, setSchool] = useState("");
  const [occupation, setOccupation] = useState("");

  // 2. Nhu cầu tìm bạn cùng phòng
  const [isSearching, setIsSearching] = useState(true);
  const [city, setCity] = useState("Hà Nội");
  const [districts, setDistricts] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  // 3. Ảnh phòng đang ở
  const [roomImages, setRoomImages] = useState<string[]>([]);

  // 4. Lịch sinh hoạt và lối sống
  const [sleepTime, setSleepTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [scheduleType, setScheduleType] = useState("");
  const [cleanliness, setCleanliness] = useState(3);
  const [noiseTolerance, setNoiseTolerance] = useState(3);
  const [privacyNeed, setPrivacyNeed] = useState(3);
  const [guestFrequency, setGuestFrequency] = useState("");
  const [commonSpaceUse, setCommonSpaceUse] = useState("");
  const [smoking, setSmoking] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [hobbies, setHobbies] = useState("");
  const [requirements, setRequirements] = useState("");

  // 5. Mức độ quan trọng
  const [weights, setWeights] = useState({
    budget: { value: 3, strict: false },
    location: { value: 3, strict: false },
    schedule: { value: 3, strict: false },
    cleanliness: { value: 3, strict: false },
    lifestyle: { value: 3, strict: false },
    privacy: { value: 3, strict: false },
    commonSpace: { value: 3, strict: false },
    hobbies: { value: 3, strict: false },
  });

  // 6. Quyền riêng tư
  const [privacySettings, setPrivacySettings] = useState({
    showSchool: true,
    showOccupation: true,
    showBudget: true,
    showSchedule: true,
    showHobbies: true,
    showRoomImages: true,
  });

  // Hàm chọn ảnh đại diện từ thiết bị
  const handlePickAvatar = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  // Hàm chọn thêm ảnh phòng từ thiết bị
  const handleAddRoomImage = async () => {
    if (roomImages.length >= 6) {
      Alert.alert("Thông báo", "Tối đa chỉ được chọn 6 ảnh.");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setRoomImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // Fetch dữ liệu hồ sơ từ Backend với endpoint đúng chuẩn `/profiles`
  useEffect(() => {
    api
      .get("/profiles/me")
      .then((res: any) => {
        const data = res.data?.data || res.data;
        if (data) {
          setDisplayName(data.displayName || "");
          setAvatarUrl(data.avatarUrl || "");
          setBio(data.bio || "");
          setGender(data.gender || "Nam");
          setBirthYear(data.birthYear ? String(data.birthYear) : "");
          setSchool(data.school || "");
          setOccupation(data.occupation || "");

          setIsSearching(data.isSearching ?? true);
          setCity(data.city || "Hà Nội");
          setDistricts(
            Array.isArray(data.districts)
              ? data.districts.join(", ")
              : data.districts || "",
          );
          setMinBudget(data.minBudget ? String(data.minBudget) : "");
          setMaxBudget(data.maxBudget ? String(data.maxBudget) : "");
          setRoomImages(data.roomImages || []);

          setSleepTime(data.sleepTime || "");
          setWakeTime(data.wakeTime || "");
          setScheduleType(data.scheduleType || "");
          setCleanliness(data.cleanliness ?? 3);
          setNoiseTolerance(data.noiseTolerance ?? 3);
          setPrivacyNeed(data.privacyNeed ?? 3);
          setGuestFrequency(data.guestFrequency || "");
          setCommonSpaceUse(data.commonSpaceUse || "");
          setSmoking(data.smoking ?? false);
          setPetFriendly(data.petFriendly ?? false);
          setHobbies(
            Array.isArray(data.hobbies)
              ? data.hobbies.join(", ")
              : data.hobbies || "",
          );
          setRequirements(data.requirements || "");

          if (data.weights)
            setWeights((prev) => ({ ...prev, ...data.weights }));
          if (data.privacySettings)
            setPrivacySettings((prev) => ({
              ...prev,
              ...data.privacySettings,
            }));
        }
      })
      .catch((err: any) => {
        console.log("Lỗi lấy thông tin hồ sơ:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Xử lý Lưu hồ sơ: Tải ảnh đại diện & ảnh phòng lên Firebase Storage -> Lưu link https qua PUT /profiles/me
  const handleSave = async () => {
    try {
      setSaving(true);
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl && !avatarUrl.startsWith("http")) {
        finalAvatarUrl = await uploadImageToFirebase(avatarUrl, "avatars");
        setAvatarUrl(finalAvatarUrl);
      }

      const finalRoomImages = await Promise.all(
        roomImages.map((imgUri) =>
          imgUri && !imgUri.startsWith("http")
            ? uploadImageToFirebase(imgUri, "rooms")
            : Promise.resolve(imgUri),
        ),
      );
      setRoomImages(finalRoomImages);

      const payload = {
        displayName,
        avatarUrl: finalAvatarUrl,
        bio,
        gender,
        birthYear: birthYear ? Number(birthYear) : null,
        school,
        occupation,
        isSearching,
        city,
        districts: districts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        minBudget: minBudget ? Number(minBudget) : 0,
        maxBudget: maxBudget ? Number(maxBudget) : 0,
        roomImages: finalRoomImages,
        sleepTime,
        wakeTime,
        scheduleType,
        cleanliness,
        noiseTolerance,
        privacyNeed,
        guestFrequency,
        commonSpaceUse,
        smoking,
        petFriendly,
        hobbies: hobbies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        requirements,
        weights,
        privacySettings,
      };

      await api.put("/profiles/me", payload);
      await refreshProfile(); // cập nhật avatar ở tab Tài khoản ngay, không cần mở lại app

      Alert.alert("Thành công", "Đã cập nhật hồ sơ cá nhân!");
      router.back();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu thông tin hồ sơ.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <Stack.Screen options={{ title: "Chỉnh sửa hồ sơ" }} />

      {/* 1. THÔNG TIN CƠ BẢN */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin cơ bản</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên hiển thị</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Nhập tên hiển thị..."
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Ảnh đại diện vòng tròn to */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ảnh đại diện</Text>
          <View style={styles.avatarPickerRow}>
            {avatarUrl ? (
              <Image
                source={{ uri: (imageUrl(avatarUrl) || avatarUrl) as string }}
                style={styles.avatarPreviewLarge}
              />
            ) : (
              <View
                style={[
                  styles.avatarPreviewLarge,
                  {
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#0f172a",
                  },
                ]}
              >
                <Text style={{ fontSize: 24 }}>👤</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.pickImgBtn}
              onPress={handlePickAvatar}
            >
              <Text style={styles.pickImgText}>📁 Chọn ảnh từ thiết bị</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giới thiệu bản thân</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            placeholder="Viết vài nét về bạn..."
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.rowGroup}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Giới tính</Text>
            <TextInput
              style={styles.input}
              value={gender}
              onChangeText={setGender}
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Năm sinh</Text>
            <TextInput
              style={styles.input}
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="numeric"
              placeholder="VD: 2002"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.rowGroup}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Trường học</Text>
            <TextInput
              style={styles.input}
              value={school}
              onChangeText={setSchool}
              placeholder="Tên trường..."
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Nghề nghiệp</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="Công việc..."
              placeholderTextColor="#64748b"
            />
          </View>
        </View>
      </View>

      {/* 2. NHU CẦU TÌM BẠN CÙNG PHÒNG */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nhu cầu tìm bạn cùng phòng</Text>

        <View style={styles.checkboxRow}>
          <Switch
            value={isSearching}
            onValueChange={setIsSearching}
            trackColor={{ false: "#334155", true: "#6366f1" }}
          />
          <Text style={styles.checkboxLabel}>Tôi đang tìm bạn cùng phòng</Text>
        </View>
        <Text style={styles.subNote}>
          Bật để hồ sơ của bạn xuất hiện trong gợi ý của người khác
        </Text>

        <View style={styles.rowGroup}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Thành phố</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Khu vực mong muốn</Text>
            <TextInput
              style={styles.input}
              value={districts}
              onChangeText={setDistricts}
              placeholder="VD: Cầu Giấy, Đống Đa"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.rowGroup}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label} numberOfLines={1}>
              Ngân sách tối thiểu
            </Text>
            <TextInput
              style={styles.input}
              value={minBudget}
              onChangeText={setMinBudget}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label} numberOfLines={1}>
              Ngân sách tối đa
            </Text>
            <TextInput
              style={styles.input}
              value={maxBudget}
              onChangeText={setMaxBudget}
              keyboardType="numeric"
              placeholder="5000000"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>
      </View>

      {/* 3. Ảnh phòng đang ở (Khung vuông, chọn từ thiết bị) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ảnh phòng bạn đang ở</Text>
        <Text style={styles.subNote}>
          Tùy chọn. Ảnh giúp người khác hình dung nơi bạn đang sống.
        </Text>

        <View style={styles.imageGrid}>
          {roomImages.map((img, idx) => (
            <View key={idx} style={styles.imageBox}>
              <Image source={{ uri: img }} style={styles.roomImage} />
              <TouchableOpacity
                style={styles.deleteBadge}
                onPress={() =>
                  setRoomImages((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          ))}
          {roomImages.length < 6 && (
            <TouchableOpacity
              style={styles.addImgBox}
              onPress={handleAddRoomImage}
            >
              <Text style={styles.addImgText}>+ Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. LỊCH SINH HOẠT VÀ LỐI SỐNG */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lịch sinh hoạt và lối sống</Text>

        <View style={styles.rowGroup}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Giờ đi ngủ</Text>
            <TextInput
              style={styles.input}
              value={sleepTime}
              onChangeText={setSleepTime}
              placeholder="23:00"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Giờ thức dậy</Text>
            <TextInput
              style={styles.input}
              value={wakeTime}
              onChangeText={setWakeTime}
              placeholder="07:00"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Kiểu lịch</Text>
            <TextInput
              style={styles.input}
              value={scheduleType}
              onChangeText={setScheduleType}
              placeholder="Sinh viên"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        <View style={styles.sliderGroup}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Mức độ sạch sẽ, ngăn nắp</Text>
            <Text style={styles.sliderVal}>{cleanliness}</Text>
          </View>
          <Slider
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={cleanliness}
            onValueChange={setCleanliness}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#334155"
            thumbTintColor="#6366f1"
          />
        </View>

        <View style={styles.sliderGroup}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Nhu cầu riêng tư</Text>
            <Text style={styles.sliderVal}>{privacyNeed}</Text>
          </View>
          <Slider
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={privacyNeed}
            onValueChange={setPrivacyNeed}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#334155"
            thumbTintColor="#6366f1"
          />
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={smoking}
            onValueChange={setSmoking}
            trackColor={{ false: "#334155", true: "#6366f1" }}
          />
          <Text style={styles.checkboxLabel}>Có hút thuốc</Text>

          <View style={{ width: 20 }} />

          <Switch
            value={petFriendly}
            onValueChange={setPetFriendly}
            trackColor={{ false: "#334155", true: "#6366f1" }}
          />
          <Text style={styles.checkboxLabel}>Có thú cưng</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sở thích</Text>
          <TextInput
            style={styles.input}
            value={hobbies}
            onChangeText={setHobbies}
            placeholder="Đọc sách, thể thao, nghe nhạc..."
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Yêu cầu khi sống chung</Text>
          <TextInput
            style={styles.input}
            value={requirements}
            onChangeText={setRequirements}
            placeholder="Sạch sẽ, tôn trọng giờ giấc..."
            placeholderTextColor="#64748b"
          />
        </View>
      </View>

      {/* 5. MỨC ĐỘ QUAN TRỌNG CỦA TỪNG TIÊU CHÍ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Mức độ quan trọng của từng tiêu chí
        </Text>
        <Text style={styles.subNote}>
          Kéo cao nếu bạn coi trọng tiêu chí đó. Tích 'Bắt buộc' nếu lệch nhiều
          thì không muốn thấy.
        </Text>

        {Object.entries(weights).map(([key, item]) => {
          const labels: Record<string, string> = {
            budget: "Ngân sách",
            location: "Khu vực",
            schedule: "Giờ giấc",
            cleanliness: "Sạch sẽ",
            lifestyle: "Lối sống",
            privacy: "Riêng tư",
            commonSpace: "Không gian chung",
            hobbies: "Sở thích",
          };

          return (
            <View key={key} style={styles.weightItem}>
              <View style={styles.sliderHeader}>
                <Text style={styles.label}>{labels[key] || key}</Text>
                <Text style={styles.sliderVal}>{item.value}</Text>
              </View>
              <View style={styles.weightRow}>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={item.value}
                  onValueChange={(v) =>
                    setWeights((prev: any) => ({
                      ...prev,
                      [key]: { ...prev[key], value: v },
                    }))
                  }
                  minimumTrackTintColor="#6366f1"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#6366f1"
                />
                <View style={styles.strictBox}>
                  <Switch
                    value={item.strict}
                    onValueChange={(s) =>
                      setWeights((prev: any) => ({
                        ...prev,
                        [key]: { ...prev[key], strict: s },
                      }))
                    }
                    trackColor={{ false: "#334155", true: "#6366f1" }}
                  />
                  <Text style={styles.strictText}>Bắt buộc</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* 6. QUYỀN RIÊNG TƯ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quyền riêng tư</Text>
        <Text style={styles.subNote}>
          Thông tin bị ẩn vẫn được dùng tính điểm tương thích nhưng người khác
          không nhìn thấy.
        </Text>

        {[
          { key: "showSchool", label: "Hiển thị trường học" },
          { key: "showOccupation", label: "Hiển thị nghề nghiệp" },
          { key: "showBudget", label: "Hiển thị ngân sách" },
          { key: "showSchedule", label: "Hiển thị lịch sinh hoạt" },
          { key: "showHobbies", label: "Hiển thị sở thích" },
          { key: "showRoomImages", label: "Hiển thị ảnh phòng đang ở" },
        ].map((p) => (
          <View key={p.key} style={styles.privacyRow}>
            <Switch
              value={(privacySettings as any)[p.key]}
              onValueChange={(val) =>
                setPrivacySettings((prev) => ({ ...prev, [p.key]: val }))
              }
              trackColor={{ false: "#334155", true: "#6366f1" }}
            />
            <Text style={styles.checkboxLabel}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* NÚT LƯU HỒ SƠ */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Lưu hồ sơ</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 8,
  },
  headerSub: { fontSize: 13, color: "#94a3b8", marginBottom: 16, marginTop: 4 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc" },
  subNote: { fontSize: 12, color: "#94a3b8", lineHeight: 18 },
  inputGroup: { gap: 6 },
  rowGroup: { flexDirection: "row", gap: 10 },
  label: { fontSize: 13, fontWeight: "600", color: "#cbd5e1" },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 12,
    color: "#f8fafc",
    fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  avatarPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  avatarPreviewLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#334155",
  },
  pickImgBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pickImgText: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkboxLabel: { fontSize: 14, color: "#f8fafc" },
  sliderGroup: { gap: 4 },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderVal: { fontSize: 14, color: "#6366f1", fontWeight: "700" },
  weightItem: { gap: 4, marginVertical: 4 },
  weightRow: { flexDirection: "row", alignItems: "center" },
  strictBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  strictText: { fontSize: 12, color: "#cbd5e1" },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  imageBox: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  roomImage: { width: "100%", height: "100%" },
  deleteBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  addImgBox: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: "#334155",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addImgText: { color: "#94a3b8", fontSize: 12 },
  saveBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
