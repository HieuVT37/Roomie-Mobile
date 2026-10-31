import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import {
  createPassApi,
  deletePassApi,
  getPassApi,
  listPassApi,
  myPassApi
} from "../../api/pass";
import { uploadImagesApi } from "../../api/uploads";
import { PassCard } from "../../components/cards";
import { EditPassModalInline } from "../../components/pass/EditPassModalInline";
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
  const [isSearching, setIsSearching] = useState(false);
  // Danh sách các bài pass vừa tạo trên client để luôn hiển thị ngay lập tức
  const [recentCreated, setRecentCreated] = useState<any[]>([]);
  
  // State cho modal chỉnh sửa
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);

  // Tự động tìm kiếm tức thì khi người dùng nhập (debounce 300ms)
  useEffect(() => {
    if (text.trim()) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setQ(text.trim());
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const handleClearFilter = () => {
    setText("");
    setQ("");
    setIsSearching(false);
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

    // Chỉ hiển thị tin đã được duyệt ở tab room/item (không áp dụng cho "Tin của tôi")
    let filteredByModeration = tab === "mine"
      ? serverItems
      : serverItems.filter((item: any) => item.moderationStatus === "approved");

    // Lọc các bài vừa tạo khớp với tab hiện tại
    const relevantRecent = recentCreated.filter((item) => {
      if (tab === "mine") return true;
      if (tab === "room") return item.type === "room";
      if (tab === "item") return item.type === "item";
      return true;
    });

    // Tránh trùng lặp id
    const existingIds = new Set(
      filteredByModeration.map((it: any) => String(it.id || it._id)),
    );
    const uniqueRecent = relevantRecent.filter(
      (it: any) => !existingIds.has(String(it.id || it._id)),
    );

    let allItems = [...uniqueRecent, ...filteredByModeration];

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
    // KHÔNG thêm vào recentCreated nữa vì bài đăng cần được duyệt trước
    // Chỉ chuyển đến tab "Tin của tôi" để người dùng xem trạng thái
    setTab("mine");
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
                  {isSearching && (
                    <View style={{ padding: 4 }}>
                      <Ionicons name="hourglass-outline" size={18} color={themeColors.primary} />
                    </View>
                  )}
                  {text.length > 0 && !isSearching && (
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
          {list.loading && !q ? (
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
                              : "Chờ quản trị duyệt"}
                        </Text>
                      </View>
                      <Pressable
                        style={s.mineEditBtn}
                        onPress={async () => {
                          const id = item.id || item._id;
                          try {
                            const detail = await getPassApi(id);
                            // Server có thể wrap: { listing, contact } hoặc trực tiếp trả item
                            const listing = detail?.listing || detail;
                            // Lấy contact từ nhiều nguồn có thể, ưu tiên contact field trước
                            const contact = 
                              detail?.contact ||
                              listing.contact || 
                              listing.contactPhone || 
                              detail?.contactPhone ||
                              item.contact || 
                              item.contactPhone || 
                              "";
                            // Đảm bảo contact được set vào listing object
                            setEditingItem({ ...listing, contact: String(contact || "") });
                          } catch {
                            // Nếu fetch thất bại, dùng data hiện có và lấy contact
                            const contact = item.contact || item.contactPhone || "";
                            setEditingItem({ ...item, contact: String(contact || "") });
                          }
                          setShowEditModal(true);
                        }}
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

      {/* Modal Chỉnh sửa bài Pass */}
      {showEditModal && editingItem && (
        <EditPassModalInline
          visible={showEditModal}
          initialListing={editingItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingItem(null);
            list.refresh();
          }}
        />
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
  const scrollRef = useRef<ScrollView | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Lưu vị trí Y của các trường để scroll đến trường có lỗi
  const fieldPositions = useRef<Record<string, number>>({});

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

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hình ảnh (lưu thông tin asset từ ImagePicker)
  const [imageAssets, setImageAssets] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (type === "room") {
      // Validate Pass Phòng
      
      // 1. Tiêu đề
      if (!roomForm.title.trim()) {
        newErrors.title = "Vui lòng nhập tiêu đề";
      } else if (roomForm.title.trim().length < 10) {
        newErrors.title = "Tiêu đề phải có ít nhất 10 ký tự";
      } else if (roomForm.title.trim().length > 100) {
        newErrors.title = "Tiêu đề không được quá 100 ký tự";
      }

      // 2. Mô tả bắt buộc nhập
      if (!roomForm.description.trim()) {
        newErrors.description = "Vui lòng nhập mô tả phòng";
      }

      // 3. Giá thuê là số nguyên dương > 0, bắt buộc nhập
      if (!roomForm.price.trim()) {
        newErrors.price = "Vui lòng nhập giá thuê";
      } else if (isNaN(Number(roomForm.price))) {
        newErrors.price = "Giá thuê phải là số";
      } else {
        const priceNum = Number(roomForm.price);
        if (!Number.isInteger(priceNum)) {
          newErrors.price = "Giá thuê phải là số nguyên";
        } else if (priceNum <= 0) {
          newErrors.price = "Giá thuê phải lớn hơn 0";
        } else if (priceNum > 100000000) {
          newErrors.price = "Giá thuê không hợp lệ (quá 100 triệu)";
        }
      }

      // 4. Khu vực bắt buộc nhập
      if (!roomForm.location.trim()) {
        newErrors.location = "Vui lòng nhập khu vực";
      }

      // 5. Số điện thoại bắt buộc nhập và phải là 10 số bắt đầu bằng 0
      if (!roomForm.contact.trim()) {
        newErrors.contact = "Vui lòng nhập số điện thoại liên hệ";
      } else {
        const phone = roomForm.contact.trim().replace(/[\s\-]/g, ""); // Xóa space và dấu -
        if (!/^0\d{9}$/.test(phone)) {
          newErrors.contact = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0";
        }
      }

      // 6. Địa chỉ chi tiết phòng bắt buộc nhập
      if (!roomForm.address.trim()) {
        newErrors.address = "Vui lòng nhập địa chỉ chi tiết phòng";
      }

      // 7. Tiền cọc là số nguyên dương > 0, bắt buộc nhập
      if (!roomForm.deposit.trim()) {
        newErrors.deposit = "Vui lòng nhập tiền cọc";
      } else if (isNaN(Number(roomForm.deposit))) {
        newErrors.deposit = "Tiền cọc phải là số";
      } else {
        const depositNum = Number(roomForm.deposit);
        if (!Number.isInteger(depositNum)) {
          newErrors.deposit = "Tiền cọc phải là số nguyên";
        } else if (depositNum <= 0) {
          newErrors.deposit = "Tiền cọc phải lớn hơn 0";
        }
      }

      // 8. Số tháng hợp đồng còn lại là số nguyên dương > 0, bắt buộc nhập
      const leaseMonths = roomForm.remainingLeaseMonths.trim();
      if (!leaseMonths) {
        newErrors.remainingLeaseMonths = "Vui lòng nhập số tháng hợp đồng còn lại";
      } else if (isNaN(Number(leaseMonths))) {
        newErrors.remainingLeaseMonths = "Số tháng phải là số";
      } else {
        const monthsNum = Number(leaseMonths);
        if (!Number.isInteger(monthsNum)) {
          newErrors.remainingLeaseMonths = "Số tháng phải là số nguyên";
        } else if (monthsNum <= 0) {
          newErrors.remainingLeaseMonths = "Số tháng phải lớn hơn 0";
        } else if (monthsNum > 120) {
          newErrors.remainingLeaseMonths = "Số tháng không được quá 120";
        }
      }

      // 9. Bàn giao từ ngày - bắt buộc và phải từ hiện tại + số tháng hợp đồng còn lại
      if (!roomForm.availableFrom.trim()) {
        newErrors.availableFrom = "Vui lòng chọn ngày bàn giao";
      } else if (leaseMonths && !isNaN(Number(leaseMonths))) {
        const selectedDate = new Date(roomForm.availableFrom);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const monthsRemaining = Number(leaseMonths);
        const minDate = new Date(today);
        minDate.setMonth(minDate.getMonth() + monthsRemaining);
        
        if (selectedDate < minDate) {
          newErrors.availableFrom = `Ngày bàn giao phải từ ${minDate.toLocaleDateString('vi-VN')} trở đi (hiện tại + ${monthsRemaining} tháng hợp đồng)`;
        }
      }

      // 10. Điều khoản chuyển nhượng bắt buộc nhập
      if (!roomForm.transferTerms.trim()) {
        newErrors.transferTerms = "Vui lòng nhập điều khoản chuyển nhượng";
      }

      // 11. Hình ảnh bắt buộc
      if (imageAssets.length === 0) {
        newErrors.images = "Vui lòng thêm ít nhất 1 hình ảnh phòng";
      }

    } else {
      // Validate Pass Đồ
      
      // 1. Tiêu đề bắt buộc nhập
      if (!itemForm.title.trim()) {
        newErrors.title = "Vui lòng nhập tên món đồ";
      } else if (itemForm.title.trim().length < 5) {
        newErrors.title = "Tên món đồ phải có ít nhất 5 ký tự";
      } else if (itemForm.title.trim().length > 100) {
        newErrors.title = "Tên món đồ không được quá 100 ký tự";
      }

      // 2. Mô tả bắt buộc nhập
      if (!itemForm.description.trim()) {
        newErrors.description = "Vui lòng nhập mô tả món đồ";
      }

      // 3. Giá bán bắt buộc nhập, số nguyên dương > 0 (trừ khi là cho tặng)
      if (itemForm.dealType !== "give_away") {
        if (!itemForm.price.trim()) {
          newErrors.price = "Vui lòng nhập giá bán";
        } else if (isNaN(Number(itemForm.price))) {
          newErrors.price = "Giá bán phải là số";
        } else {
          const priceNum = Number(itemForm.price);
          if (!Number.isInteger(priceNum)) {
            newErrors.price = "Giá bán phải là số nguyên";
          } else if (priceNum <= 0) {
            newErrors.price = "Giá bán phải lớn hơn 0";
          } else if (priceNum > 100000000) {
            newErrors.price = "Giá bán không hợp lệ (quá 100 triệu)";
          }
        }
      }

      // 4. Khu vực bắt buộc nhập
      if (!itemForm.location.trim()) {
        newErrors.location = "Vui lòng nhập khu vực";
      }

      // 5. Thông tin liên hệ bắt buộc nhập và phải là 10 số bắt đầu bằng 0
      if (!itemForm.contact.trim()) {
        newErrors.contact = "Vui lòng nhập số điện thoại liên hệ";
      } else {
        const phone = itemForm.contact.trim().replace(/[\s\-]/g, ""); // Xóa space và dấu -
        if (!/^0\d{9}$/.test(phone)) {
          newErrors.contact = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0";
        }
      }

      // 6. Hình ảnh bắt buộc
      if (imageAssets.length === 0) {
        newErrors.images = "Vui lòng thêm ít nhất 1 hình ảnh món đồ";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Scroll to first error field
  const scrollToError = () => {
    if (!scrollRef.current) return;
    
    // Tìm trường đầu tiên có lỗi
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return;
    
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
  };

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

  // Helper render error
  const ErrorText = ({ field }: { field: string }) => {
    if (!errors[field]) return null;
    return (
      <Text style={{ color: themeColors.danger, fontSize: 12, marginTop: -6 }}>
        {errors[field]}
      </Text>
    );
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      scrollToError();
      // Không hiển thị Alert nữa, chỉ scroll đến lỗi
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

      // 2. Chuẩn bị payload
      let payload: any;

      if (type === "room") {
        const leaseMonths = Number(roomForm.remainingLeaseMonths);

        // Format availableFrom chuẩn YYYY-MM-DD (đã được format từ DatePicker)
        let availDate: string | null = null;
        if (roomForm.availableFrom.trim()) {
          availDate = roomForm.availableFrom.trim();
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
        "✅ Đã gửi bài đăng",
        "Bài viết của bạn đang chờ quản trị viên duyệt. Sau khi được duyệt, bài viết sẽ hiển thị công khai.\n\nBạn có thể xem trạng thái ở tab 'Tin của tôi'.",
        [
          {
            text: "Đồng ý",
            onPress: () => {
              // Reset form
              if (type === "room") {
                setRoomForm({
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
              } else {
                setItemForm({
                  title: "",
                  description: "",
                  price: "",
                  location: "",
                  contact: "",
                  category: "furniture",
                  condition: "good",
                  dealType: "sell",
                });
              }
              setImageAssets([]);
              setErrors({});
              onSuccess(createdListing, type);
            },
          },
        ]
      );

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
    <ScrollView ref={scrollRef as any} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Thông báo về kiểm duyệt */}
      <View style={{ backgroundColor: "#1e3a8a", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#3b82f6" }}>
        <Text style={{ color: "#93c5fd", fontSize: 13, lineHeight: 20 }}>
          ℹ️ <Text style={{ fontWeight: "700" }}>Lưu ý:</Text> Tất cả bài đăng cần được quản trị viên duyệt trước khi hiển thị công khai. Mọi chỉnh sửa sau này cũng sẽ cần được duyệt lại.
        </Text>
      </View>

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
          <View onLayout={(e) => (fieldPositions.current.title = e.nativeEvent.layout.y)}>
            <Text style={s.fieldLabel}>
              Tiêu đề <Text style={{ color: themeColors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[s.input, errors.title && { borderColor: themeColors.danger, borderWidth: 1 }]}
              placeholder={
                type === "room"
                  ? "Pass phòng trọ 25m² Cầu Giấy, đủ đồ..."
                  : "Bàn học gỗ + ghế, còn mới 90%"
              }
              placeholderTextColor="#64748b"
              value={type === "room" ? roomForm.title : itemForm.title}
              onChangeText={(val) => {
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: "" }));
                }
                type === "room"
                  ? setRoomForm({ ...roomForm, title: val })
                  : setItemForm({ ...itemForm, title: val });
              }}
            />
            <ErrorText field="title" />
          </View>

          <View onLayout={(e) => (fieldPositions.current.description = e.nativeEvent.layout.y)}>
            <Text style={s.fieldLabel}>
              Mô tả <Text style={{ color: themeColors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[s.input, { height: 100, textAlignVertical: "top" }, errors.description && { borderColor: themeColors.danger, borderWidth: 1 }]}
              placeholder="Mô tả chi tiết phòng / món đồ cần pass..."
              placeholderTextColor="#64748b"
              multiline
              value={
                type === "room" ? roomForm.description : itemForm.description
              }
              onChangeText={(val) => {
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: "" }));
                }
                type === "room"
                  ? setRoomForm({ ...roomForm, description: val })
                  : setItemForm({ ...itemForm, description: val });
              }}
            />
            <ErrorText field="description" />
          </View>

          <View onLayout={(e) => (fieldPositions.current.price = e.nativeEvent.layout.y)}>
            <Text style={s.fieldLabel}>
              {type === "room"
                ? "Giá thuê (VNĐ/tháng)"
                : itemForm.dealType === "give_away"
                  ? "Giá (0đ - Cho tặng)"
                  : "Giá bán (VNĐ)"}
              {(type === "room" || (type === "item" && itemForm.dealType !== "give_away")) && (
                <Text style={{ color: themeColors.danger }}> *</Text>
              )}
            </Text>
            <TextInput
              style={[
                s.input,
                type === "item" &&
                  itemForm.dealType === "give_away" && { opacity: 0.6 },
                errors.price && { borderColor: themeColors.danger, borderWidth: 1 },
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
              onChangeText={(val) => {
                if (errors.price) {
                  setErrors((prev) => ({ ...prev, price: "" }));
                }
                type === "room"
                  ? setRoomForm({ ...roomForm, price: val })
                  : setItemForm({ ...itemForm, price: val });
              }}
            />
            <ErrorText field="price" />
          </View>

          <View onLayout={(e) => (fieldPositions.current.location = e.nativeEvent.layout.y)}>
            <Text style={s.fieldLabel}>
              Khu vực (quận, thành phố) <Text style={{ color: themeColors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[s.input, errors.location && { borderColor: themeColors.danger, borderWidth: 1 }]}
              placeholder="Cầu Giấy, Hà Nội"
              placeholderTextColor="#64748b"
              value={type === "room" ? roomForm.location : itemForm.location}
              onChangeText={(val) => {
                if (errors.location) {
                  setErrors((prev) => ({ ...prev, location: "" }));
                }
                type === "room"
                  ? setRoomForm({ ...roomForm, location: val })
                  : setItemForm({ ...itemForm, location: val });
              }}
            />
            <ErrorText field="location" />
          </View>

          <View onLayout={(e) => (fieldPositions.current.contact = e.nativeEvent.layout.y)}>
            <Text style={s.fieldLabel}>
              Thông tin liên hệ (SĐT, Zalo - chỉ hiển thị với người đã đăng nhập)
              <Text style={{ color: themeColors.danger }}> *</Text>
            </Text>
            <TextInput
              style={[s.input, errors.contact && { borderColor: themeColors.danger, borderWidth: 1 }]}
              placeholder="SĐT / Zalo: 0900000000"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={type === "room" ? roomForm.contact : itemForm.contact}
              onChangeText={(val) => {
                if (errors.contact) {
                  setErrors((prev) => ({ ...prev, contact: "" }));
                }
                type === "room"
                  ? setRoomForm({ ...roomForm, contact: val })
                  : setItemForm({ ...itemForm, contact: val });
              }}
            />
            <ErrorText field="contact" />
          </View>
        </View>
      </View>

      {/* 3A. Thông tin phòng */}
      {type === "room" && (
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Thông tin phòng</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <View onLayout={(e) => (fieldPositions.current.address = e.nativeEvent.layout.y)}>
              <Text style={s.fieldLabel}>
                Địa chỉ chi tiết của phòng{" "}
                <Text style={{ color: themeColors.danger }}>*</Text>
              </Text>
              <TextInput
                style={[s.input, errors.address && { borderColor: themeColors.danger, borderWidth: 1 }]}
                placeholder="VD: Số 12 ngõ 45 Cầu Giấy, Hà Nội"
                placeholderTextColor="#64748b"
                value={roomForm.address}
                onChangeText={(val) => {
                  if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
                  setRoomForm({ ...roomForm, address: val });
                }}
              />
              <ErrorText field="address" />
            </View>

            <View onLayout={(e) => (fieldPositions.current.deposit = e.nativeEvent.layout.y)}>
              <Text style={s.fieldLabel}>
                Tiền cọc (VNĐ) <Text style={{ color: themeColors.danger }}>*</Text>
              </Text>
              <TextInput
                style={[s.input, errors.deposit && { borderColor: themeColors.danger, borderWidth: 1 }]}
                placeholder="VD: 3000000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={roomForm.deposit}
                onChangeText={(val) => {
                  if (errors.deposit) setErrors((prev) => ({ ...prev, deposit: "" }));
                  setRoomForm({ ...roomForm, deposit: val });
                }}
              />
              <ErrorText field="deposit" />
            </View>

            <View onLayout={(e) => (fieldPositions.current.remainingLeaseMonths = e.nativeEvent.layout.y)}>
              <Text style={s.fieldLabel}>
                Số tháng hợp đồng còn lại (0 - 120){" "}
                <Text style={{ color: themeColors.danger }}>*</Text>
              </Text>
              <TextInput
                style={[s.input, errors.remainingLeaseMonths && { borderColor: themeColors.danger, borderWidth: 1 }]}
                placeholder="VD: 6 (tháng)"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={roomForm.remainingLeaseMonths}
                onChangeText={(val) => {
                  if (errors.remainingLeaseMonths) setErrors((prev) => ({ ...prev, remainingLeaseMonths: "" }));
                  setRoomForm({ ...roomForm, remainingLeaseMonths: val });
                }}
              />
              <ErrorText field="remainingLeaseMonths" />
            </View>

            <View onLayout={(e) => (fieldPositions.current.availableFrom = e.nativeEvent.layout.y)}>
              <Text style={s.fieldLabel}>
                Bàn giao từ ngày <Text style={{ color: themeColors.danger }}>*</Text>
              </Text>
              <Pressable
                style={[s.input, errors.availableFrom && { borderColor: themeColors.danger, borderWidth: 1 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: roomForm.availableFrom ? themeColors.text : "#64748b" }}>
                  {roomForm.availableFrom 
                    ? new Date(roomForm.availableFrom).toLocaleDateString("vi-VN")
                    : "Chọn ngày bàn giao"}
                </Text>
              </Pressable>
              <ErrorText field="availableFrom" />
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={roomForm.availableFrom ? new Date(roomForm.availableFrom) : (() => {
                  // Tính ngày tối thiểu = hiện tại + số tháng hợp đồng còn lại
                  const minDate = new Date();
                  const monthsRemaining = Number(roomForm.remainingLeaseMonths) || 0;
                  minDate.setMonth(minDate.getMonth() + monthsRemaining);
                  return minDate;
                })()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={(() => {
                  // Ngày tối thiểu = hiện tại + số tháng hợp đồng còn lại
                  const minDate = new Date();
                  const monthsRemaining = Number(roomForm.remainingLeaseMonths) || 0;
                  minDate.setMonth(minDate.getMonth() + monthsRemaining);
                  return minDate;
                })()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (event.type === "set" && selectedDate) {
                    const formatted = selectedDate.toISOString().split("T")[0];
                    if (errors.availableFrom) {
                      setErrors((prev) => ({ ...prev, availableFrom: "" }));
                    }
                    setRoomForm({ ...roomForm, availableFrom: formatted });
                  }
                }}
              />
            )}

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

            <View onLayout={(e) => (fieldPositions.current.transferTerms = e.nativeEvent.layout.y)}>
              <Text style={s.fieldLabel}>
                Điều khoản chuyển nhượng <Text style={{ color: themeColors.danger }}>*</Text>
              </Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: "top" }, errors.transferTerms && { borderColor: themeColors.danger, borderWidth: 1 }]}
                placeholder="VD: Bên nhận chuyển lại tiền cọc cho bên pass..."
                placeholderTextColor="#64748b"
                multiline
                value={roomForm.transferTerms}
                onChangeText={(val) => {
                  if (errors.transferTerms) {
                    setErrors((prev) => ({ ...prev, transferTerms: "" }));
                  }
                  setRoomForm({ ...roomForm, transferTerms: val });
                }}
              />
              <ErrorText field="transferTerms" />
            </View>
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
      <View style={s.sectionCard} onLayout={(e) => (fieldPositions.current.images = e.nativeEvent.layout.y)}>
        <Text style={s.sectionTitle}>
          Hình ảnh ({imageAssets.length}/8) <Text style={{ color: themeColors.danger }}>*</Text>
        </Text>
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
        <ErrorText field="images" />
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
    marginTop: 0,
    marginBottom: 12,
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
