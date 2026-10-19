import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Gọi API lấy thông tin chi tiết người dùng theo ID
    fetch(`https://roomie-bi5u.onrender.com/api/users/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{ title: "Thông tin cá nhân", headerBackTitle: "Quay lại" }}
      />

      {/* Header Avatar & Tên */}
      <View style={styles.header}>
        <Image
          source={{ uri: user?.avatarUrl || "https://via.placeholder.com/150" }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.fullName || "Trịnh Thanh Giang"}</Text>
        <Text style={styles.subText}>
          {user?.age || "17"} tuổi • {user?.gender || "Nam"} •{" "}
          {user?.school || "Đại học Công Nghệ"}
        </Text>
      </View>

      {/* Thông tin mô tả */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giới thiệu bản thân</Text>
        <Text style={styles.bioText}>
          {user?.bio ||
            "Wibu lỏ, thích đọc truyện tranh và xem hoạt hình Nhật Bản..."}
        </Text>
      </View>

      {/* Tiêu chí tìm phòng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nhu cầu tìm phòng</Text>
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              💰 {user?.budget || "2.500.000đ - 5.000.000đ"}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>📍 {user?.location || "Phú Hữu"}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              📍 {user?.district || "Thạch Thất"}
            </Text>
          </View>
        </View>
      </View>

      {/* Nút hành động */}
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => alert("Đã gửi yêu cầu kết nối!")}
      >
        <Ionicons
          name="person-add"
          size={20}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.connectButtonText}>Gửi yêu cầu kết nối</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", padding: 24, backgroundColor: "#fff" },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "bold", color: "#111" },
  subText: { fontSize: 14, color: "#666", marginTop: 4 },
  section: { backgroundColor: "#fff", marginTop: 12, padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  bioText: { fontSize: 15, color: "#444", lineHeight: 22 },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { color: "#3b82f6", fontSize: 13, fontWeight: "500" },
  connectButton: {
    margin: 20,
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  connectButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
