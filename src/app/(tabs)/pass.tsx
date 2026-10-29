import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  createPassApi,
  deletePassApi,
  listPassApi,
  myPassApi,
} from "../../api/pass";
import { uploadImagesApi } from "../../api/uploads";
import { PassCard } from "../../components/cards";
import { Loading, Segments, shared } from "../../components/ui";
import {
  useInfiniteList,
  useTabPressScrollTop,
} from "../../hooks/use-infinite-list";
import {
  CONDITION_LABELS,
  DEAL_LABELS,
  ITEM_CATEGORY_LABELS,
  normalizeVietnamese,
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

// Đồng bộ chính xác với backend Enum
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

export default function PassListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("room");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  // Danh sách các bài pass vừa tạo trên client để luôn hiển thị ngay lập tức
  const [recentCreated, setRecentCreated] = useState<any[]>([]);

  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);

  // Tự động tìm kiếm tức thì khi người dùng nhập (debounce 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(text.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const handleClearFilter = () => {
    setText("");
    setQ("");
  };

  const fetchItems = useCallback(
    async (p: number) => {
      if (tab === "mine") {
        return myPassApi();
      }
      const params: any = {
        page: p,
        limit: 30,
        type: tab === "room" || tab === "item" ? tab : undefined,
      };
      if (q) {
        if (tab === "room") {
          params.area = q;
        } else {
          params.q = q;
        }
      }
      try {
        const res = await listPassApi(params);
        // Nếu có q mà server trả về rỗng (ví dụ do gõ tiếng Việt không dấu),
        // tải toàn bộ bài đăng thuộc tab đó để client tự lọc chuẩn xác
        if (q && (!res?.items || res.items.length === 0)) {
          const fallback = await listPassApi({
            page: p,
            limit: 30,
            type: tab === "room" || tab === "item" ? tab : undefined,
          });
          return fallback;
        }
        return res;
      } catch {
        return listPassApi({
          page: p,
          limit: 30,
          type: tab === "room" || tab === "item" ? tab : undefined,
        });
      }
    },
    [q, tab],
  );

  const list = useInfiniteList(fetchItems, [q, tab]);

  // Hợp nhất bài vừa tạo vào danh sách hiển thị và lọc theo khu vực / tên món đồ
  const displayItems = useMemo(() => {
    const serverItems = list.items || [];
    if (tab === "create") return [];

    // Lọc các bài vừa tạo khớp với tab hiện tại
    const relevantRecent = recentCreated.filter((item) => {
      if (tab === "mine") return true;
      if (tab === "room") return item.type === "room";
      if (tab === "item") return item.type === "item";
      return true;
    });

    // Tránh trùng lặp id
    const existingIds = new Set(
      serverItems.map((it: any) => String(it.id || it._id)),
    );
    const uniqueRecent = relevantRecent.filter(
      (it: any) => !existingIds.has(String(it.id || it._id)),
    );

    let allItems = [...uniqueRecent, ...serverItems];

    if (q) {
      const normQ = normalizeVietnamese(q);
      if (tab === "room") {
        // Pass phòng: CHỈ tìm kiếm theo khu vực (area, address) - KHÔNG tìm theo tiêu đề
        allItems = allItems.filter((item) => {
          const areaNorm = normalizeVietnamese(item.area || "");
          const addrNorm = normalizeVietnamese(item.roomInfo?.address || "");
          return areaNorm.includes(normQ) || addrNorm.includes(normQ);
        });
      } else if (tab === "item") {
        // Pass đồ: CHỈ tìm kiếm theo tên món đồ (title) - KHÔNG tìm theo khu vực
        allItems = allItems.filter((item) => {
          const titleNorm = normalizeVietnamese(item.title || "");
          return titleNorm.includes(normQ);
        });
      }
    }

    return allItems;
  }, [list.items, recentCreated, tab, q]);

  const handleCreatedSuccess = (
    createdItem: any,
    createdType: "room" | "item",
  ) => {
    if (createdItem) {
      setRecentCreated((prev) => [createdItem, ...prev]);
    }
    // Chuyển ngay đến tab tương ứng để người dùng thấy bài vừa đăng
    setTab(createdType);
  };

  const handleDeleteMine = (item: any) => {
    const id = item.id || item._id;
    Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa bài "${item.title}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePassApi(id);
            setRecentCreated((prev) =>
              prev.filter((it) => String(it.id || it._id) !== String(id)),
            );
            list.refresh();
            Alert.alert("Thành công", "Đã xóa bài pass.");
          } catch (err: any) {
            Alert.alert(
              "Lỗi",
              err.response?.data?.message || "Không thể xóa bài pass.",
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <Segments
        value={tab}
        onChange={(newTab) => {
          setTab(newTab);
          setText("");
          setQ("");
        }}
        options={[
          { key: "room", label: "Pass phòng" },
          { key: "item", label: "Pass đồ" },
          { key: "mine", label: "Tin của tôi" },
          { key: "create", label: "Tin mới" },
        ]}
      />

      {tab === "create" ? (
        <CreatePassForm onSuccess={handleCreatedSuccess} />
      ) : (
        <>
          {(tab === "room" || tab === "item") && (
            <View style={{ marginBottom: 4 }}>
              <View style={s.searchContainer}>
                <View style={s.searchBar}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="#64748b"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={s.searchInput}
                    placeholder={
                      tab === "room"
                        ? "Tìm theo khu vực (quận, phường, địa chỉ)..."
                        : "Tìm theo tên món đồ..."
                    }
                    placeholderTextColor="#64748b"
                    value={text}
                    onChangeText={setText}
                    returnKeyType="search"
                  />
                  {text.length > 0 && (
                    <Pressable
                      hitSlop={8}
                      onPress={handleClearFilter}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </Pressable>
                  )}
                </View>
              </View>

              
            </View>
          )}
          {list.loading ? (
            <Loading />
          ) : (
            <FlatList
              style={{ flex: 1, backgroundColor: themeColors.bg }}
              ref={listRef}
              data={displayItems}
              keyExtractor={(it) => String(it.id || it._id || Math.random())}
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
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 24,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={[shared.empty, { textAlign: "center" }]}>
                    {list.error ||
                      (q
                        ? (tab === "room" ? `Không tìm thấy phòng ở khu vực "${q}".` : `Không tìm thấy món đồ nào có tên "${q}".`)
                        : tab === "mine"
                          ? "Bạn chưa đăng bài nào."
                          : tab === "room"
                            ? "Chưa có bài Pass phòng nào."
                            : "Chưa có bài Pass đồ nào.")}
                  </Text>
                  {!!q && (
                    <Pressable
                      style={s.clearFilterEmptyBtn}
                      onPress={handleClearFilter}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#fff" />
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        Xóa bộ lọc & Tải lại
                      </Text>
                    </Pressable>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <View>
                  <PassCard item={item} />
                  {/* Nếu ở tab Tin của tôi, hiển thị thanh quản lý Sửa / Xóa */}
                  {tab === "mine" && (
                    <View style={s.mineActionRow}>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={[
                            s.dotStatus,
                            {
                              backgroundColor:
                                item.moderationStatus === "approved"
                                  ? themeColors.success
                                  : item.moderationStatus === "rejected"
                                    ? themeColors.danger
                                    : themeColors.warning,
                            },
                          ]}
                        />
                        <Text style={s.moderationText}>
                          {item.moderationStatus === "approved"
                            ? "Đã duyệt công khai"
                            : item.moderationStatus === "rejected"
                              ? "Bị từ chối"
                              : "Đang hiển thị"}
                        </Text>
                      </View>
                      <Pressable
                        style={s.mineEditBtn}
                        onPress={() =>
                          router.push({
                            pathname: "/pass/[id]",
                            params: {
                              id: String(item.id || item._id),
                              edit: "true",
                            },
                          })
                        }
                      >
                        <Text style={s.mineEditBtnText}> Sửa</Text>
                      </Pressable>
                      <Pressable
                        style={s.mineDeleteBtn}
                        onPress={() => handleDeleteMine(item)}
                      >
                        <Text style={s.mineDeleteBtnText}>Xóa</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

function CreatePassForm({
  onSuccess,
}: {
  onSuccess: (createdItem: any, type: "room" | "item") => void;
}) {
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
    condition: "good",
    dealType: "sell",
  });

  // Hình ảnh (lưu thông tin asset từ ImagePicker)
  const [imageAssets, setImageAssets] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    if (imageAssets.length >= 8) {
      Alert.alert("Giới hạn", "Tối đa chỉ được chọn 8 hình ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8 - imageAssets.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageAssets((prev) => [...prev, ...result.assets].slice(0, 8));
    }
  };

  const removeImage = (index: number) => {
    setImageAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const currentTitle = type === "room" ? roomForm.title : itemForm.title;
    if (!currentTitle.trim() || currentTitle.trim().length < 3) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập tiêu đề từ 3 ký tự trở lên.",
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Upload ảnh lên server (nếu có chọn)
      let uploadedImageUrls: string[] = [];
      if (imageAssets.length > 0) {
        const files = imageAssets.map((asset, index) => {
          const filename =
            asset.fileName ||
            asset.uri.split("/").pop() ||
            `image_${Date.now()}_${index}.jpg`;
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
        uploadedImageUrls = Array.isArray(uploadResult)
          ? uploadResult
          : uploadResult.urls || [];
      }

      // 2. Chuẩn bị payload hợp lệ đúng 100% với backend validator
      let payload: any;

      if (type === "room") {
        if (!roomForm.address.trim()) {
          Alert.alert("Thiếu thông tin", "Vui lòng nhập địa chỉ phòng.");
          setLoading(false);
          return;
        }

        const leaseMonths =
          roomForm.remainingLeaseMonths.trim() !== ""
            ? Number(roomForm.remainingLeaseMonths)
            : 0;

        if (isNaN(leaseMonths) || leaseMonths < 0 || leaseMonths > 120) {
          Alert.alert("Lỗi", "Số tháng hợp đồng còn lại phải từ 0 đến 120.");
          setLoading(false);
          return;
        }

        // Format availableFrom chuẩn YYYY-MM-DD
        let availDate: string | null = null;
        if (roomForm.availableFrom.trim()) {
          const raw = roomForm.availableFrom.trim();
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
            const [d, m, y] = raw.split("/");
            availDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            availDate = raw;
          } else {
            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) {
              availDate = parsed.toISOString().slice(0, 10);
            }
          }
        }

        payload = {
          type: "room",
          title: roomForm.title.trim(),
          description: roomForm.description.trim(),
          price: roomForm.price ? Number(roomForm.price) : null,
          area: roomForm.location.trim() || undefined,
          contact: roomForm.contact.trim() || undefined,
          images: uploadedImageUrls,
          roomInfo: {
            address: roomForm.address.trim(),
            deposit: roomForm.deposit ? Number(roomForm.deposit) : null,
            remainingLeaseMonths: leaseMonths,
            availableFrom: availDate,
            landlordAgreed: Boolean(roomForm.landlordAgreed),
            transferTerms: roomForm.transferTerms.trim() || undefined,
          },
        };
      } else {
        payload = {
          type: "item",
          title: itemForm.title.trim(),
          description: itemForm.description.trim(),
          price:
            itemForm.dealType === "give_away"
              ? 0
              : itemForm.price
                ? Number(itemForm.price)
                : null,
          area: itemForm.location.trim() || undefined,
          contact: itemForm.contact.trim() || undefined,
          images: uploadedImageUrls,
          itemInfo: {
            category: itemForm.category,
            condition: itemForm.condition,
            dealType: itemForm.dealType,
          },
        };
      }

      const res = await createPassApi(payload);
      const createdListing = res?.listing || res;

      Alert.alert(
        "Thành công",
        "Đã đăng bài pass mới thành công! Bài viết đã sẵn sàng hiển thị.",
      );

      onSuccess(createdListing, type);
    } catch (err: any) {
      const errMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Không thể tạo bài pass. Vui lòng kiểm tra lại thông tin.";
      Alert.alert("Lỗi", errMsg);
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

      {/* 2. Thông tin chính */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Thông tin chính</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Text style={s.fieldLabel}>
            Tiêu đề <Text style={{ color: themeColors.danger }}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            placeholder={
              type === "room"
                ? "Pass phòng trọ 25m² Cầu Giấy, đủ đồ..."
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
            placeholder="Mô tả chi tiết phòng / món đồ cần pass..."
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
            {type === "room"
              ? "Giá thuê (VNĐ/tháng)"
              : itemForm.dealType === "give_away"
                ? "Giá (0đ - Cho tặng)"
                : "Giá bán (VNĐ, để trống nếu thỏa thuận)"}
          </Text>
          <TextInput
            style={[
              s.input,
              type === "item" &&
                itemForm.dealType === "give_away" && { opacity: 0.6 },
            ]}
            placeholder="Giá (VNĐ)"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            editable={type === "room" || itemForm.dealType !== "give_away"}
            value={
              type === "room"
                ? roomForm.price
                : itemForm.dealType === "give_away"
                  ? "0"
                  : itemForm.price
            }
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, price: val })
                : setItemForm({ ...itemForm, price: val })
            }
          />

          <Text style={s.fieldLabel}>Khu vực (quận, thành phố)</Text>
          <TextInput
            style={s.input}
            placeholder="Cầu Giấy, Hà Nội"
            placeholderTextColor="#64748b"
            value={type === "room" ? roomForm.location : itemForm.location}
            onChangeText={(val) =>
              type === "room"
                ? setRoomForm({ ...roomForm, location: val })
                : setItemForm({ ...itemForm, location: val })
            }
          />

          <Text style={s.fieldLabel}>
            Thông tin liên hệ (SĐT, Zalo - chỉ hiển thị với người đã đăng nhập)
          </Text>
          <TextInput
            style={s.input}
            placeholder="SĐT / Zalo: 0900000000"
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
            <Text style={s.fieldLabel}>
              Địa chỉ chi tiết của phòng{" "}
              <Text style={{ color: themeColors.danger }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="VD: Số 12 ngõ 45 Cầu Giấy, Hà Nội"
              placeholderTextColor="#64748b"
              value={roomForm.address}
              onChangeText={(val) => setRoomForm({ ...roomForm, address: val })}
            />

            <Text style={s.fieldLabel}>Tiền cọc (VNĐ)</Text>
            <TextInput
              style={s.input}
              placeholder="VD: 3000000"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={roomForm.deposit}
              onChangeText={(val) => setRoomForm({ ...roomForm, deposit: val })}
            />

            <Text style={s.fieldLabel}>
              Số tháng hợp đồng còn lại (0 - 120){" "}
              <Text style={{ color: themeColors.danger }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="VD: 6 (tháng)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={roomForm.remainingLeaseMonths}
              onChangeText={(val) =>
                setRoomForm({ ...roomForm, remainingLeaseMonths: val })
              }
            />

            <Text style={s.fieldLabel}>Bàn giao từ ngày (dd/mm/yyyy)</Text>
            <TextInput
              style={s.input}
              placeholder="VD: 01/11/2026 hoặc 2026-11-01"
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
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="VD: Bên nhận chuyển lại tiền cọc cho bên pass..."
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
        <Text style={s.sectionTitle}>Hình ảnh ({imageAssets.length}/8)</Text>
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

          {imageAssets.map((asset, idx) => (
            <View key={idx} style={s.imageWrapper}>
              <Image source={{ uri: asset.uri }} style={s.previewImage} />
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
          JPG, PNG hoặc WebP, tối đa 8 ảnh.
        </Text>
      </View>

      <Pressable
        style={[s.submitButton, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={handleSubmit}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
          {loading ? "Đang đăng..." : "Đăng bài ngay"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: themeColors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: themeColors.primary,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  activeFilterBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  activeFilterText: {
    color: themeColors.muted,
    fontSize: 13,
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  clearFilterBtnText: {
    color: themeColors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  clearFilterEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
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
  mineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -8,
    gap: 8,
  },
  dotStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moderationText: {
    fontSize: 12,
    color: themeColors.muted,
    fontWeight: "500",
  },
  mineEditBtn: {
    backgroundColor: "#312e81",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mineEditBtnText: {
    color: "#a5b4fc",
    fontWeight: "600",
    fontSize: 12,
  },
  mineDeleteBtn: {
    backgroundColor: "#450a0a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mineDeleteBtnText: {
    color: "#fca5a5",
    fontWeight: "600",
    fontSize: 12,
  },
});
