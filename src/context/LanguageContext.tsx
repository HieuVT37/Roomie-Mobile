import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type Language = "vi" | "en";

const STORAGE_KEY = "roomie_app_language";

const translations = {
  vi: {
    tabs: {
      home: "Tìm phòng",
      pass: "Pass",
      connections: "Kết nối",
      messages: "Tin nhắn",
      account: "Tài khoản",
    },
    stack: {
      login: "Đăng nhập",
      passDetail: "Chi tiết Pass",
      accommodationDetail: "Chi tiết phòng",
      chat: "Tin nhắn",
      favorites: "Yêu thích",
      profileDetail: "Hồ sơ cá nhân",
      editProfile: "Chỉnh sửa hồ sơ",
      subscription: "Gói dịch vụ",
      support: "Trung tâm hỗ trợ",
    },
    common: {
      checkingAuth: "Đang kiểm tra đăng nhập...",
      loading: "Đang tải...",
      notLoggedIn: "Bạn chưa đăng nhập",
      loginBtn: "Đăng nhập",
      yes: "Có",
      no: "Không",
      back: "Quay lại",
      retry: "Thử lại",
      success: "Thành công",
      error: "Lỗi",
    },
    messages: {
      title: "Tin nhắn",
      loginPrompt: "Đăng nhập để nhắn tin với bạn cùng phòng và người đăng tin.",
      loadError: "Không tải được danh sách",
      emptyTitle: "Chưa có cuộc trò chuyện",
      emptySub: "Chưa có cuộc trò chuyện nào. Hãy kết nối với ai đó hoặc bấm “Nhắn tin” ở một tin đăng.",
      noMessageYet: "Chưa có tin nhắn",
      sentImage: "[Đã gửi ảnh]",
    },
    chat: {
      defaultTitle: "Tin nhắn",
      loadingMessages: "Đang tải tin nhắn...",
      loadError: "Không tải được tin nhắn",
      sendError: "Không gửi được tin nhắn",
      sendImageErrorTitle: "Không gửi được ảnh",
      emptyPrompt: "Hãy gửi tin nhắn đầu tiên.",
      inputPlaceholder: "Nhập tin nhắn...",
      sendBtn: "Gửi",
      cannotSendNotice: "Hai bạn chưa kết nối hoặc kết nối đã bị hủy nên không thể nhắn tin.",
    },
    account: {
      loginPrompt: "Đăng nhập để xem thông tin liên hệ, yêu thích tin và nhắn tin.",
      email: "Email",
      plan: "Gói dịch vụ",
      landlordRole: "Quyền chủ trọ",
      hasLandlord: "Có",
      noLandlord: "Chưa có",
      languageLabel: "🌐 Ngôn ngữ / Language",
      languageValue: "Tiếng Việt (VI)",
      editProfile: "✏️ Chỉnh sửa hồ sơ",
      subscription: "💎 Gói dịch vụ",
      savedPosts: "❤️ Tin đã lưu",
      supportCenter: "🛠️ Trung tâm hỗ trợ",
      logout: "Đăng xuất",
    },
    profile: {
      defaultName: "Người dùng",
      title: "Hồ sơ cá nhân",
      loadingProfile: "Đang tải thông tin hồ sơ...",
      loadError: "Không thể tải thêm thông tin chi tiết từ máy chủ.",
      notFound: "Không tìm thấy hồ sơ",
      ageSuffix: "tuổi",
      matchBadge: "Phù hợp",
      failedDealBreakers: "Không đạt tiêu chí bắt buộc:",
      aboutTitle: "Giới thiệu bản thân",
      compatibilityTitle: "Mức độ tương thích chi tiết",
      livingInfoTitle: "Thông tin sống chung",
      city: "Thành phố",
      preferredLocations: "Khu vực mong muốn",
      budget: "Ngân sách",
      schedule: "Lịch sinh hoạt",
      sleep: "Ngủ",
      wake: "Dậy",
      cleanliness: "Sạch sẽ, ngăn nắp",
      noiseLevel: "Mức độ ồn chấp nhận",
      privacyNeed: "Nhu cầu riêng tư",
      pointsSuffix: "điểm",
      guestFrequency: "Tiếp khách qua đêm",
      sharedSpaceUsage: "Dùng không gian chung",
      smoking: "Hút thuốc",
      pets: "Thú cưng",
      interests: "Sở thích",
      requirements: "Yêu cầu khi sống chung",
      roomPhotosTitle: "Hình ảnh phòng đang ở",
      messageNowBtn: "💬 Nhắn tin ngay",
      requestSentBadge: "✓ Đã gửi yêu cầu kết nối",
      acceptConnectionBtn: "Chấp nhận kết nối",
      sendConnectBtn: "Gửi yêu cầu kết nối",
      connectSentSuccess: "Đã gửi yêu cầu kết nối!",
      connectSendErrorTitle: "Không gửi được yêu cầu",
      connectSendErrorMsg: "Có lỗi xảy ra, vui lòng thử lại.",
      openChatError: "Không thể mở cuộc trò chuyện.",
    },
  },
  en: {
    tabs: {
      home: "Explore",
      pass: "Sublet",
      connections: "Connections",
      messages: "Messages",
      account: "Account",
    },
    stack: {
      login: "Sign In",
      passDetail: "Sublet Details",
      accommodationDetail: "Room Details",
      chat: "Messages",
      favorites: "Favorites",
      profileDetail: "User Profile",
      editProfile: "Edit Profile",
      subscription: "Subscription Plans",
      support: "Support Center",
    },
    common: {
      checkingAuth: "Checking authentication...",
      loading: "Loading...",
      notLoggedIn: "You are not signed in",
      loginBtn: "Sign In",
      yes: "Yes",
      no: "No",
      back: "Go Back",
      retry: "Retry",
      success: "Success",
      error: "Error",
    },
    messages: {
      title: "Messages",
      loginPrompt: "Sign in to chat with potential roommates and hosts.",
      loadError: "Failed to load conversations",
      emptyTitle: "No conversations yet",
      emptySub: "No conversations yet. Connect with someone or tap “Message” on a listing.",
      noMessageYet: "No messages yet",
      sentImage: "[Sent an image]",
    },
    chat: {
      defaultTitle: "Messages",
      loadingMessages: "Loading messages...",
      loadError: "Failed to load messages",
      sendError: "Failed to send message",
      sendImageErrorTitle: "Failed to send image",
      emptyPrompt: "Say hello to start the conversation.",
      inputPlaceholder: "Type a message...",
      sendBtn: "Send",
      cannotSendNotice: "You are not connected or the connection was removed, so you cannot chat.",
    },
    account: {
      loginPrompt: "Sign in to view contact details, save favorites, and send messages.",
      email: "Email",
      plan: "Current Plan",
      landlordRole: "Landlord Access",
      hasLandlord: "Enabled",
      noLandlord: "Not enabled",
      languageLabel: "🌐 Language / Ngôn ngữ",
      languageValue: "English (EN)",
      editProfile: "✏️ Edit Profile",
      subscription: "💎 Subscription Plans",
      savedPosts: "❤️ Saved Listings",
      supportCenter: "🛠️ Support Center",
      logout: "Log Out",
    },
    profile: {
      defaultName: "Roomie User",
      title: "User Profile",
      loadingProfile: "Loading profile details...",
      loadError: "Could not load additional profile details from server.",
      notFound: "Profile not found",
      ageSuffix: "yrs old",
      matchBadge: "Match",
      failedDealBreakers: "Failed deal-breakers:",
      aboutTitle: "About Me",
      compatibilityTitle: "Detailed Compatibility Breakdown",
      livingInfoTitle: "Co-living Preferences",
      city: "City",
      preferredLocations: "Preferred Areas",
      budget: "Budget",
      schedule: "Daily Schedule",
      sleep: "Sleep",
      wake: "Wake",
      cleanliness: "Cleanliness",
      noiseLevel: "Noise Tolerance",
      privacyNeed: "Privacy Need",
      pointsSuffix: "pts",
      guestFrequency: "Overnight Guests",
      sharedSpaceUsage: "Shared Space Usage",
      smoking: "Smoking",
      pets: "Pets",
      interests: "Interests",
      requirements: "House Rules / Requirements",
      roomPhotosTitle: "Current Room Photos",
      messageNowBtn: "💬 Message Now",
      requestSentBadge: "✓ Connection Request Sent",
      acceptConnectionBtn: "Accept Connection",
      sendConnectBtn: "Send Connection Request",
      connectSentSuccess: "Connection request sent!",
      connectSendErrorTitle: "Failed to send request",
      connectSendErrorMsg: "Something went wrong, please try again.",
      openChatError: "Could not open conversation.",
    },
  },
};

type TranslationsType = typeof translations.vi;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: TranslationsType;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "vi",
  setLanguage: async () => {},
  toggleLanguage: async () => {},
  t: translations.vi,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("vi");

  useEffect(() => {
    (async () => {
      try {
        const saved =
          Platform.OS === "web"
            ? localStorage.getItem(STORAGE_KEY)
            : await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved === "vi" || saved === "en") {
          setLangState(saved);
        }
      } catch {}
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLangState(lang);
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(STORAGE_KEY, lang);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, lang);
      }
    } catch {}
  }, []);

  const toggleLanguage = useCallback(async () => {
    const nextLang: Language = language === "vi" ? "en" : "vi";
    await setLanguage(nextLang);
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: translations[language],
    }),
    [language, setLanguage, toggleLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
