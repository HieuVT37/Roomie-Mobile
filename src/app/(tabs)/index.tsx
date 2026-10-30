import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createAccommodationApi,
  listAccommodationsApi,
  myAccommodationsApi,
} from "../../api/accommodations";
import { myBillingApi } from "../../api/billing";
import { AccommodationCard } from "../../components/cards";
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
  placeholder: "#64748b",
  primary: "#6366f1",
  muted: "#94a3b8",
};

export default function AccommodationListScreen() {
  const [tab, setTab] = useState("search"); // "search" | "mine" | "create"
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const listRef = useRef<FlatList>(null);
  useTabPressScrollTop(listRef);

  // --- LẤY GÓI HIỆN TẠI TỪ SERVER (GET /billing/me) ---
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Gọi lại mỗi khi màn hình được focus (vd: vừa nâng cấp xong quay lại)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      myBillingApi()
        .then((r) => {
          if (alive) setPlan(r?.plan ? String(r.plan).toLowerCase() : null);
        })
        .catch((e) => console.log("myBilling error:", e))
        .finally(() => {
          if (alive) setPlanLoading(false);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const isVipUser = plan === "pro" || plan === "plus";

  const list = useInfiniteList(
    (p) =>
      tab === "mine" && isVipUser
        ? myAccommodationsApi()
        : listAccommodationsApi({ page: p, limit: 12, q }),
    [q, tab, isVipUser],
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      {/* Thanh tab điều hướng */}
      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { key: "search", label: "Tìm phòng" },
          { key: "mine", label: "Tin của tôi" },
          { key: "create", label: "Tin mới" },
        ]}
      />

      {/* Tab 'Tin mới' */}
      {tab === "create" ? (
        planLoading ? (
          <Loading />
        ) : isVipUser ? (
          <CreateAccommodationForm onSuccess={() => setTab("mine")} />
        ) : (
          <UpgradeNoticeBanner title="Đăng tin cho thuê phòng mới" />
        )
      ) : null}

      {/* Tab 'Tin của tôi' nhưng không đủ quyền */}
      {tab === "mine" && !isVipUser ? (
        planLoading ? (
          <Loading />
        ) : (
          <UpgradeNoticeBanner title="Quản lý bài đăng của tôi" />
        )
      ) : null}

      {/* Danh sách 'Tìm phòng' hoặc 'Tin của tôi' hợp lệ */}
      {(tab === "search" || (tab === "mine" && isVipUser)) && (
        <>
          {tab === "search" && (
            <TextInput
              style={s.searchBox}
              placeholder="Tìm theo tiêu đề, quận, phường..."
              placeholderTextColor={themeColors.placeholder}
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
                      ? "Bạn chưa đăng tin cho thuê phòng nào."
                      : "Không có tin nào phù hợp.")}
                </Text>
              }
              renderItem={({ item }) => <AccommodationCard item={item} />}
            />
          )}
        </>
      )}
    </View>
  );
}

// Component hiển thị thông báo yêu cầu nâng cấp ngay trong trang
function UpgradeNoticeBanner({ title }: { title: string }) {
  const router = useRouter();

  return (
    <View style={s.noticeContainer}>
      <View style={s.noticeCard}>
        <Text style={s.noticeIcon}>⭐</Text>
        <Text style={s.noticeTitle}>{title}</Text>
        <Text style={s.noticeText}>
          Tính năng này chỉ dành riêng cho tài khoản gói{" "}
          <Text style={{ color: "#a855f7", fontWeight: "700" }}>Plus</Text> hoặc{" "}
          <Text style={{ color: themeColors.primary, fontWeight: "700" }}>
            Pro
          </Text>
          .
        </Text>
        <Text style={[s.noticeText, { marginTop: 4 }]}>
          Vui lòng nâng cấp gói dịch vụ để bắt đầu đăng và quản lý các bài đăng
          tìm phòng cho thuê.
        </Text>

        <Pressable
          style={s.upgradeBtn}
          onPress={() => {
            router.push("/account" as any);
          }}
        >
          <Text style={s.upgradeBtnText}>Nâng cấp gói dịch vụ</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Form tạo tin phòng mới
function CreateAccommodationForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !address.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề và địa chỉ.");
      return;
    }

    setLoading(true);
    try {
      await createAccommodationApi({
        title: title.trim(),
        description: description.trim(),
        price: price ? Number(price) : 0,
        address: address.trim(),
        contact: contact.trim(),
      });
      onSuccess();
    } catch (err: any) {
      console.log(err);
      Alert.alert(
        "Không thể đăng tin",
        err?.response?.data?.message || "Đã có lỗi xảy ra, vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Thông tin phòng cho thuê</Text>

        <Text style={s.fieldLabel}>Tiêu đề bài đăng</Text>
        <TextInput
          style={s.input}
          placeholder="VD: Cho thuê phòng trọ khép kín 25m²..."
          placeholderTextColor={themeColors.placeholder}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={s.fieldLabel}>Địa chỉ chi tiết</Text>
        <TextInput
          style={s.input}
          placeholder="VD: Số 12, ngõ 45 Triều Khúc..."
          placeholderTextColor={themeColors.placeholder}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={s.fieldLabel}>Giá thuê (VNĐ/tháng)</Text>
        <TextInput
          style={s.input}
          placeholder="VD: 3500000"
          placeholderTextColor={themeColors.placeholder}
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={s.fieldLabel}>Mô tả chi tiết</Text>
        <TextInput
          style={[s.input, { height: 100, textAlignVertical: "top" }]}
          placeholder="Mô tả chi tiết..."
          placeholderTextColor={themeColors.placeholder}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={s.fieldLabel}>Thông tin liên hệ</Text>
        <TextInput
          style={s.input}
          placeholder="VD: Zalo / SĐT: 0987654321"
          placeholderTextColor={themeColors.placeholder}
          value={contact}
          onChangeText={setContact}
        />
      </View>

      <Pressable
        style={[s.submitButton, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={handleSubmit}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
          {loading ? "Đang đăng..." : "Đăng tin phòng"}
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
    marginVertical: 8,
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
    gap: 8,
  },
  sectionTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  fieldLabel: {
    color: themeColors.muted,
    fontSize: 13,
    marginTop: 4,
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
  submitButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  noticeContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeCard: {
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  noticeIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  noticeTitle: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  noticeText: {
    color: themeColors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  upgradeBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
