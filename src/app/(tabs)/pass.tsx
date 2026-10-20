import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { createPassApi, listPassApi, myPassApi } from "../../api/pass";
import { PassCard } from "../../components/cards";
import { Loading, Segments, shared } from "../../components/ui";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";

const themeColors = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f8fafc",
  muted: "#94a3b8",
  primary: "#6366f1",
};

const CATEGORY_OPTIONS = [
  { key: "furniture", label: "Nội thất" },
  { key: "appliance", label: "Gia dụng" },
  { key: "electronics", label: "Điện tử" },
  { key: "other", label: "Khác" },
];

const CONDITION_OPTIONS = [
  { key: "new", label: "Mới 100%" },
  { key: "like_new", label: "Tốt" },
  { key: "used", label: "Đã qua sử dụng" },
];

const DEAL_OPTIONS = [
  { key: "sell", label: "Bán" },
  { key: "giveaway", label: "Tặng miễn phí" },
];

export default function PassListScreen() {
  const [tab, setTab] = useState("room");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);

  const list = useInfiniteList(
    (p) =>
      tab === "mine"
        ? myPassApi()
        : listPassApi({
            page: p,
            limit: 12,
            q,
            type: tab === "room" || tab === "item" ? tab : undefined,
          }),
    [q, tab],
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { key: "room", label: "Pass phòng" },
          { key: "item", label: "Pass đồ" },
          { key: "mine", label: "Tin của tôi" },
          { key: "create", label: "Tin mới" },
        ]}
      />

      {tab === "create" ? (
        <CreatePassForm onSuccess={() => setTab("mine")} />
      ) : (
        <>
          {(tab === "room" || tab === "item") && (
            <TextInput
              style={s.searchBox}
              placeholder={
                tab === "room"
                  ? "Tìm kiếm phòng trọ..."
                  : "Tìm kiếm đồ dùng đang pass..."
              }
              placeholderTextColor="#64748b"
              value={text}
              onChangeText={setText}
              returnKeyType="search"
              onSubmitEditing={() => setQ(text.trim())}
            />
          )}
          {list.loading ? (
            <Loading />
          ) : (
            <FlatList
              style={{ flex: 1, backgroundColor: themeColors.bg }}
              ref={listRef}
              data={list.items}
              keyExtractor={(it) => it.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 12, gap: 12 }}
              refreshControl={
                <RefreshControl
                  refreshing={list.refreshing}
                  onRefresh={list.refresh}
                  tintColor={themeColors.primary}
                  colors={[themeColors.primary]}
                />
              }
              onEndReachedThreshold={0.5}
              onEndReached={list.loadMore}
              ListEmptyComponent={
                <Text style={shared.empty}>
                  {list.error ||
                    (tab === "mine"
                      ? "Bạn chưa đăng bài nào."
                      : tab === "room"
                        ? "Chưa có bài Pass phòng nào."
                        : "Chưa có bài Pass đồ nào.")}
                </Text>
              }
              renderItem={({ item }) => <PassCard item={item} />}
            />
          )}
        </>
      )}
    </View>
  );
}

function CreatePassForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<"item" | "room">("room");

  // State riêng biệt cho Pass phòng
  const [roomForm, setRoomForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    contact: "",
    address: "",
    deposit: "",
    remainingLeaseMonths: "",
    availableFrom: "",
    landlordAgreed: false,
    transferTerms: "",
  });

  // State riêng biệt cho Pass đồ
  const [itemForm, setItemForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    contact: "",
    category: "furniture",
    condition: "new",
    dealType: "sell",
  });

  // Hình ảnh
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    if (images.length >= 8) {
      Alert.alert("Giới hạn", "Tối đa chỉ được chọn 8 hình ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8 - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...selectedUris].slice(0, 8));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const currentTitle = type === "room" ? roomForm.title : itemForm.title;
    if (!currentTitle.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề bài pass.");
      return;
    }

    setLoading(true);
    try {
      let payload: any;

      if (type === "room") {
        payload = {
          type: "room",
          title: roomForm.title.trim(),
          description: roomForm.description.trim(),
          price: roomForm.price ? Number(roomForm.price) : null,
          area: roomForm.location.trim() || undefined,
          contact: roomForm.contact.trim() || undefined,
          images,
          roomInfo: {
            address: roomForm.address.trim() || undefined,
            deposit: roomForm.deposit ? Number(roomForm.deposit) : null,
            remainingLeaseMonths: roomForm.remainingLeaseMonths
              ? Number(roomForm.remainingLeaseMonths)
              : null,
            availableFrom: roomForm.availableFrom.trim() || null,
            landlordAgreed: roomForm.landlordAgreed,
            transferTerms: roomForm.transferTerms.trim() || undefined,
          },
        };
      } else {
        payload = {
          type: "item",
          title: itemForm.title.trim(),
          description: itemForm.description.trim(),
          price:
            itemForm.dealType === "giveaway"
              ? 0
              : itemForm.price
                ? Number(itemForm.price)
                : null,
          area: itemForm.location.trim() || undefined,
          contact: itemForm.location.trim() || undefined,
          images,
          itemInfo: {
            category: itemForm.category,
            condition: itemForm.condition,
            dealType: itemForm.dealType,
          },
        };
      }

      await createPassApi(payload);
      Alert.alert("Thành công", "Đã đăng bài pass mới thành công!");
      onSuccess();
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể tạo bài pass.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* 1. Chọn loại bài đăng */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          style={[s.typeButton, type === "room" && s.typeButtonActive]}
          onPress={() => setType("room")}
        >
          <Text style={s.typeText}>🏠 Pass phòng</Text>
        </Pressable>
        <Pressable
          style={[s.typeButton, type === "item" && s.typeButtonActive]}
          onPress={() => setType("item")}
        >
          <Text style={s.typeText}>📦 Pass đồ</Text>
        </Pressable>
      </View>

      {/* 2. Thông tin chính (Độc lập cho từng tab) */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Thông tin chính</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Text style={s.fieldLabel}>Tiêu đề</Text>
          <TextInput
            style={s.input}
            placeholder={
              type === "room"
                ? "Pass phòng trọ..."
                : "Bàn học gỗ + ghế, còn mới 90%"
            }
            placeholderTextColor="#64748b"
            value={type === "room" ? roomForm.title : itemForm.title}
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, title: val })
                : setItemForm({ ...itemForm, title: val })
            }
          />

          <Text style={s.fieldLabel}>Mô tả</Text>
          <TextInput
            style={[s.input, { height: 100, textAlignVertical: "top" }]}
            placeholder="Mô tả chi tiết..."
            placeholderTextColor="#64748b"
            multiline
            value={
              type === "room" ? roomForm.description : itemForm.description
            }
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, description: val })
                : setItemForm({ ...itemForm, description: val })
            }
          />

          <Text style={s.fieldLabel}>
            {type === "room" ? "Giá thuê (VNĐ/tháng)" : "Giá bán (VNĐ)"}
          </Text>
          <TextInput
            style={s.input}
            placeholder="Giá (để trống nếu thỏa thuận)"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={type === "room" ? roomForm.price : itemForm.price}
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, price: val })
                : setItemForm({ ...itemForm, price: val })
            }
          />

          <Text style={s.fieldLabel}>Khu vực</Text>
          <TextInput
            style={s.input}
            placeholder="Thanh Xuân, Hà Nội"
            placeholderTextColor="#64748b"
            value={type === "room" ? roomForm.location : itemForm.location}
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, location: val })
                : setItemForm({ ...itemForm, location: val })
            }
          />

          <Text style={s.fieldLabel}>
            Thông tin liên hệ (chỉ người đã đăng nhập mới thấy)
          </Text>
          <TextInput
            style={s.input}
            placeholder="Zalo: 0900000000"
            placeholderTextColor="#64748b"
            value={type === "room" ? roomForm.contact : itemForm.contact}
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, contact: val })
                : setItemForm({ ...itemForm, contact: val })
            }
          />
        </View>
      </View>

      {/* 3A. Thông tin phòng */}
      {type === "room" && (
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Thông tin phòng</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <Text style={s.fieldLabel}>Địa chỉ phòng</Text>
            <TextInput
              style={s.input}
              placeholder="Nhập địa chỉ chi tiết..."
              placeholderTextColor="#64748b"
              value={roomForm.address}
              onChangeText={(val) => setRoomForm({ ...roomForm, address: val })}
            />

            <Text style={s.fieldLabel}>Tiền cọc (VNĐ)</Text>
            <TextInput
              style={s.input}
              placeholder="Nhập số tiền cọc..."
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={roomForm.deposit}
              onChangeText={(val) => setRoomForm({ ...roomForm, deposit: val })}
            />

            <Text style={s.fieldLabel}>Hợp đồng còn lại (tháng)</Text>
            <TextInput
              style={s.input}
              placeholder="VD: 5"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={roomForm.remainingLeaseMonths}
              onChangeText={(val) =>
                setRoomForm({ ...roomForm, remainingLeaseMonths: val })
              }
            />

            <Text style={s.fieldLabel}>Bàn giao từ ngày</Text>
            <TextInput
              style={s.input}
              placeholder="dd/mm/yyyy"
              placeholderTextColor="#64748b"
              value={roomForm.availableFrom}
              onChangeText={(val) =>
                setRoomForm({ ...roomForm, availableFrom: val })
              }
            />

            <View style={s.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: themeColors.text, fontWeight: "600" }}>
                  Chủ nhà đã đồng ý cho chuyển nhượng
                </Text>
                <Text style={{ color: themeColors.muted, fontSize: 12 }}>
                  Nên xác nhận với chủ nhà trước khi đăng để tránh tranh chấp
                </Text>
              </View>
              <Switch
                value={roomForm.landlordAgreed}
                onValueChange={(val) =>
                  setRoomForm({ ...roomForm, landlordAgreed: val })
                }
                trackColor={{ false: "#334155", true: themeColors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <Text style={s.fieldLabel}>Điều khoản chuyển nhượng</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Bên nhận chuyển lại phần tiền cọc cho bên pass..."
              placeholderTextColor="#64748b"
              multiline
              value={roomForm.transferTerms}
              onChangeText={(val) =>
                setRoomForm({ ...roomForm, transferTerms: val })
              }
            />
          </View>
        </View>
      )}

      {/* 3B. Thông tin món đồ */}
      {type === "item" && (
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Thông tin món đồ</Text>

          <Text style={s.label}>Danh mục</Text>
          <View style={s.chipContainer}>
            {CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[s.chip, itemForm.category === opt.key && s.chipActive]}
                onPress={() => setItemForm({ ...itemForm, category: opt.key })}
              >
                <Text
                  style={[
                    s.chipText,
                    itemForm.category === opt.key && s.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Tình trạng</Text>
          <View style={s.chipContainer}>
            {CONDITION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[s.chip, itemForm.condition === opt.key && s.chipActive]}
                onPress={() => setItemForm({ ...itemForm, condition: opt.key })}
              >
                <Text
                  style={[
                    s.chipText,
                    itemForm.condition === opt.key && s.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Hình thức</Text>
          <View style={s.chipContainer}>
            {DEAL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[s.chip, itemForm.dealType === opt.key && s.chipActive]}
                onPress={() => setItemForm({ ...itemForm, dealType: opt.key })}
              >
                <Text
                  style={[
                    s.chipText,
                    itemForm.dealType === opt.key && s.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 4. Hình ảnh */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Hình ảnh</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, marginTop: 10 }}
        >
          <Pressable style={s.uploadBox} onPress={pickImages}>
            <Text style={{ color: themeColors.primary, fontSize: 24 }}>+</Text>
            <Text style={{ color: themeColors.muted, fontSize: 12 }}>
              Thêm ảnh
            </Text>
          </Pressable>

          {images.map((uri, idx) => (
            <View key={idx} style={s.imageWrapper}>
              <Image source={{ uri }} style={s.previewImage} />
              <Pressable style={s.removeBadge} onPress={() => removeImage(idx)}>
                <Text
                  style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                >
                  ✕
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <Text style={{ color: themeColors.muted, fontSize: 12, marginTop: 6 }}>
          JPG, PNG hoặc WebP, tối đa 5MB mỗi ảnh, tối đa 8 ảnh.
        </Text>
      </View>

      <Pressable
        style={[s.submitButton, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={handleSubmit}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
          {loading ? "Đang đăng..." : "Đăng bài"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  searchBox: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: themeColors.text,
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 16,
    padding: 14,
  },
  sectionTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  fieldLabel: {
    color: themeColors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  typeButton: {
    flex: 1,
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  typeText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  input: {
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: themeColors.text,
    fontSize: 14,
  },
  label: {
    color: themeColors.muted,
    fontSize: 13,
    marginTop: 10,
    marginBottom: 6,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    color: "#ffffff",
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: themeColors.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginTop: 6,
  },
  uploadBox: {
    width: 80,
    height: 80,
    backgroundColor: themeColors.bg,
    borderWidth: 1,
    borderColor: themeColors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
});
