import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    LayoutAnimation,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import api from "../../api/axios";

// Dữ liệu fallback chuẩn theo ảnh bản web
const DEFAULT_FAQS = [
  {
    category: "Tài khoản",
    items: [
      {
        id: "1",
        question: "Tôi có thể ẩn thông tin cá nhân không?",
        answer:
          "Có. Trong hồ sơ, bạn chọn thông tin nào hiển thị công khai, thông tin nào chỉ dùng để tính Matching.",
      },
    ],
  },
  {
    category: "Matching",
    items: [
      {
        id: "2",
        question: "Tỷ lệ Matching được tính như thế nào?",
        answer:
          "Roomie so sánh hồ sơ của hai người theo các nhóm tiêu chí như ngân sách, khu vực, lịch sinh hoạt, mức độ sạch sẽ, lối sống... Đây là chỉ số ước tính, không đảm bảo hai người chắc chắn hòa hợp.",
      },
    ],
  },
  {
    category: "Tìm phòng",
    items: [
      {
        id: "3",
        question: "Làm sao để đăng tin cho thuê phòng?",
        answer:
          "Bạn cần đăng ký tài khoản và được cấp quyền chủ trọ để thực hiện đăng tin cho thuê phòng.",
      },
    ],
  },
  {
    category: "Pass",
    items: [
      {
        id: "4",
        question: "Tài khoản Basic được đăng mấy bài Pass?",
        answer: "Tài khoản Basic được đăng tối đa 3 bài Pass.",
      },
    ],
  },
  {
    category: "An toàn",
    items: [
      {
        id: "5",
        question: "Làm sao để báo cáo người dùng hoặc bài đăng?",
        answer:
          "Bạn có thể nhấn vào biểu tượng báo cáo ở trang thông tin chi tiết của người dùng hoặc bài đăng đó.",
      },
    ],
  },
];

export default function SupportScreen() {
  const [faqs, setFaqs] = useState<any[]>(DEFAULT_FAQS);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>("1"); // Mặc định mở câu hỏi đầu tiên

  useEffect(() => {
    api
      .get("/faqs")
      .then((res: any) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setFaqs(res.data);
        } else {
          setFaqs(DEFAULT_FAQS);
        }
      })
      .catch(() => setFaqs(DEFAULT_FAQS))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Stack.Screen options={{ title: "Hỗ trợ" }} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#6366f1"
          style={{ marginTop: 20 }}
        />
      ) : (
        faqs.map((group, groupIdx) => (
          <View key={groupIdx} style={styles.section}>
            <Text style={styles.categoryTitle}>{group.category}</Text>
            {group.items?.map((item: any) => {
              const isOpen = expandedId === item.id;
              return (
                <View key={item.id} style={styles.accordionCard}>
                  <TouchableOpacity
                    style={styles.questionHeader}
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(item.id)}
                  >
                    <Text style={styles.arrow}>{isOpen ? "▼" : "▶"}</Text>
                    <Text style={styles.questionText}>{item.question}</Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))
      )}

      {/* Thẻ liên hệ hỗ trợ bổ sung phía dưới */}
      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>Trợ giúp & Hướng dẫn Roomie</Text>
        <Text style={styles.contactSub}>
          Nếu bạn gặp bất kỳ vấn đề nào khác, vui lòng liên hệ trực tiếp với
          chúng tôi:
        </Text>
        <Text style={styles.contactItem}>• Email: support@roomie.vn</Text>
        <Text style={styles.contactItem}>• Hotline: 1900 xxxx</Text>
        <Text style={styles.contactItem}>
          • Fanpage: facebook.com/roomie.vn
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 }, // Màu nền tím/xanh đậm
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 8,
  },
  headerSub: { fontSize: 13, color: "#94a3b8", marginBottom: 20, marginTop: 4 },
  section: { marginBottom: 18 },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f1f5f9",
    marginBottom: 10,
  },
  accordionCard: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
    overflow: "hidden",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  arrow: { color: "#6366f1", fontSize: 11 },
  questionText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#f8fafc" },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  answerText: { fontSize: 14, color: "#cbd5e1", lineHeight: 21 },

  // Card thông tin liên hệ
  contactCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 18,
    marginTop: 10,
    gap: 8,
  },
  contactTitle: { fontSize: 17, fontWeight: "700", color: "#f8fafc" },
  contactSub: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 19,
    marginBottom: 4,
  },
  contactItem: { fontSize: 13, color: "#cbd5e1" },
});
