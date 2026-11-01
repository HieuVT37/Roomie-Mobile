# Báo cáo audit Roomie Mobile & đối chiếu MMA301

Ngày đánh giá: **30/10/2026**, múi giờ Asia/Saigon. Phạm vi: workspace `C:\Ki 7 SE (FALL)\MMA301\Roomie-Mobile` tại thời điểm audit.

## I. Executive Summary

**Roomie là ứng dụng Expo/React Native giúp tìm phòng, tìm bạn cùng phòng, kết nối, nhắn tin và đăng tin Pass phòng/đồ. Project có nhiều luồng nghiệp vụ thực sự được nối với REST API, nhưng hiện chưa đủ cơ sở xác nhận sẵn sàng nộp và demo.** Các nguyên nhân chính là lint/typecheck chưa đạt, một số lỗi xử lý nghiệp vụ được chứng minh từ source, hợp đồng dữ liệu chưa thống nhất và chưa có kiểm chứng APK/backend.

### 1. Hiện trạng chính

- Tên package `roomie-mobile`, phiên bản ứng dụng `1.0.0`; Expo SDK **58**, bản cài **58.0.21**; React **19.3.0**, React Native **0.88.1**. Bằng chứng: [package.json](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:2>) và lockfile.
- Kiến trúc mobile dạng **component-based + lớp API mỏng theo domain**. Expo Router quản lý Stack/Tabs; React Context quản lý phiên đăng nhập và huy hiệu thông báo; phần lớn state nằm trong screen/hook.
- Dữ liệu nghiệp vụ đến từ API ngoài workspace. **Không có mã backend, schema database, migration hoặc cấu hình database server trong workspace này.** Không được suy ra MongoDB chỉ từ trường `_id`.
- Local persistence được triển khai cho **token đăng nhập bằng SecureStore**. Không thấy SQLite, Firebase, AsyncStorage hay cache nghiệp vụ bền vững.
- Chức năng nổi bật: tìm phòng; tạo/xem tin phòng; matching roommate và điểm phù hợp; quản lý yêu cầu kết nối; chat text/ảnh; tìm/tạo/sửa/xóa/đổi trạng thái Pass; yêu thích; hồ sơ cá nhân; giao diện gói dịch vụ và FAQ.
- Không có căn cứ gọi các wrapper admin, payment simulation, report, block/unblock hoặc register là chức năng mobile hoàn chỉnh: chúng chưa được nối vào UI.

### 2. Kết quả kiểm tra đã thực hiện

| Kiểm tra | Kết quả | Giới hạn kết luận |
|---|---|---|
| Kiểm kê source | **53 module JS/TS/TSX**, khoảng **8.788 dòng** tính cả dòng trống cuối file; thêm 2 file CSS | Đã đọc toàn bộ source trong `src`, cả JSX/styles và code không được sử dụng |
| Routing | 17 file route/layout: 15 file màn/redirect và 2 layout | Đã xác định đường đi từ tab/menu/card; chưa điều khiển UI trên thiết bị |
| API layer | 14 file; 63 hàm có hậu tố `Api`; 32 có reference ngoài định nghĩa, 31 chưa có caller | Số hàm không đồng nghĩa số endpoint khác nhau hoặc số chức năng chạy được |
| `npm ls --depth=0` | Exit 0; không báo missing/invalid top-level dependency | Không chứng minh mọi native module tương thích khi build |
| Expo `install --check`, **offline** | Exit 0, “Dependencies are up to date” | CLI cũng cảnh báo validation offline không đáng tin cậy hoàn toàn; đã đối chiếu thêm bảng bundledNativeModules cục bộ |
| Expo `config --type public --json` | Exit 0; đọc được config, platform Android/iOS/Web | Chưa chạy prebuild/Gradle/EAS; không phải kết quả kiểm tra APK |
| Expo `lint --no-cache` | **Exit 1: 16 lỗi, 4 cảnh báo** | Chi tiết ở mục VII; lỗi lint không tự động đồng nghĩa crash runtime |
| TypeScript `--noEmit --incremental false` | **Exit 1: 13 diagnostics** | Có lỗi active UI và lỗi trong starter code chưa dùng; không tự động chứng minh APK không build |
| Import graph tĩnh | Không tìm thấy chu trình trong các import/export nội bộ đã phân tích | Không phải chứng minh không có mọi dạng phụ thuộc động |

Các CLI được gọi trực tiếp từ `node_modules` hiện có, không dùng lệnh có thể tải CLI mới. Không chạy `--fix`, cài/nâng cấp package, reset project, build, deploy hoặc mutation API. Chỉ tạo file báo cáo này theo yêu cầu. Trước audit đã có thay đổi của người dùng ở [package.json](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json>), [package-lock.json](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package-lock.json>), [entry index](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/index.tsx>) và [login](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/login.tsx>); không chỉnh sửa hoặc hoàn tác các thay đổi đó.

### 3. Những vấn đề quan trọng nhất

1. Ảnh chat được ghép vào host HTTP khác backend; Bearer token được gắn vào URL ảnh mà không giới hạn origin.
2. Chọn avatar/ảnh phòng trong hồ sơ chỉ lưu URI cục bộ rồi PUT JSON; thiếu bước upload ảnh.
3. Nút “Chấp nhận kết nối” trong hồ sơ gọi handler gửi yêu cầu mới và chuyển UI sang trạng thái đã gửi.
4. Đăng ký/gia hạn gói gặp lỗi API vẫn thông báo “Đã gửi yêu cầu”.
5. Kiểm tra quyền đăng tin bỏ qua `currentPlan`, trong khi Account và Subscription dùng chính trường này.
6. DTO hồ sơ và đường dẫn API support/subscription phân kỳ giữa screen và service; cần xác minh contract backend.
7. Có nguy cơ giữ dữ liệu cũ khi đổi tài khoản, race khi polling/refresh và cập nhật hồ sơ không đồng bộ Context.

**Chưa có P0 được chứng minh.** Không nâng lỗi typecheck thành “APK chắc chắn không chạy”. Tuy nhiên, các P1 và kết quả kiểm tra hiện tại đủ để khuyến nghị chưa chốt bản nộp.

### 4. Căn cứ MMA301 và giới hạn

Đã tìm tài liệu trong toàn workspace, loại trừ dependencies/cache/build/.git. Chỉ có README mẫu và AGENTS.md; **không tìm thấy đề bài cuối kỳ, rubric, syllabus, slide, lecture, lab hoặc assignment MMA301**. AGENTS.md là quy tắc làm việc của repository, không phải syllabus môn học.

Vì vậy:

- Có thể đánh giá kỹ thuật React Native và mức độ dễ hiểu/phù hợp quy mô project sinh viên.
- Chưa thể xác nhận nội dung nào là bắt buộc của lớp MMA301 cụ thể, mức điểm, số CRUD/screen tối thiểu, công nghệ được phép hoặc yêu cầu backend/database.
- Không có cơ sở tuyên bố “chuẩn 100% MMA301” hay đưa phần trăm compliance.
- TypeScript, Expo Router, Context, custom hooks, SecureStore và upload ảnh không bị coi là sai chỉ vì nâng cao. Kiến trúc hiện tại nhìn chung vừa sức; phần cần đơn giản hóa là code thừa, kiểm tra quyền đoán nhiều field và model không nhất quán.

## II. Technology Stack Inventory

### 1. Framework, runtime và công cụ

Phiên bản bên dưới là **bản thực tế trong lockfile/node_modules**; manifest có thể dùng range. “Hợp lý” trong cột cuối là nhận xét kỹ thuật cho project sinh viên, **chưa phải xác nhận syllabus MMA301**.

| Thành phần | Công nghệ | Phiên bản | Vai trò | File bằng chứng | Đánh giá MMA301 |
|---|---|---|---|---|---|
| Ngôn ngữ | TypeScript/TSX + JavaScript + CSS | TS 6.0.3 | Screen/component chủ yếu TSX; API/Auth/labels có JS | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:39>), [tsconfig](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/tsconfig.json:14>) | Hợp lý; JS không sai, nhưng contract đang bị `any` che khuất |
| Framework | Expo | 58.0.21; manifest `^58.0.0` | CLI, module native, CNG | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:10>) | Hợp lý; chưa có quy định môn học cấm Expo |
| UI runtime | React | 19.3.0 | Component, props, hooks, Context | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:25>) | Thể hiện kiến thức React cốt lõi |
| Mobile runtime | React Native | 0.88.1 | Native UI Android/iOS | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:27>) | Đúng loại ứng dụng mobile |
| Runtime phát triển | Node.js, npm/package-lock v3 | Node đang dùng 22.21.1 | Chạy CLI/toolchain; không phải runtime JS của app | [lockfile](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package-lock.json:1>) | Không thấy engines/packageManager pin; nên ghi Node version trong README |
| Entry/navigation | Expo Router | 58.0.28 | `expo-router/entry`, Stack, Tabs, dynamic route, focus hook | [entry](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:3>), [root layout](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:1>) | Nâng cao hợp lý; cần sửa API/types tabs |
| State | React `useState`, Context, refs | Theo React | Auth, notifications toàn app; form/list/chat local | [Auth](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:7>), [pagination](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:6>) | Đơn giản, phù hợp; không có Redux/Zustand |
| API | Axios | 1.20.0 | Shared instance, Bearer interceptor, JSON/multipart | [axios](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:6>) | Hợp lý cho REST và async |
| Styling | RN StyleSheet + palette object | Theo RN | Layout/spacing/màu tại screen và shared UI | [shared UI](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:20>) | Dễ giải thích; palette lặp nhiều |
| Lint | ESLint + eslint-config-expo | 9.39.5 / 58.0.4 | Kiểm tra import, hooks, JSX, style | [config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eslint.config.js:1>) | Có công cụ nhưng hiện chưa pass |
| React types | `@types/react` | 19.3.0 | TS declarations | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:36>) | Hợp lý |
| Build config | EAS Build profiles | CLI range `>=16.0.0`, chưa xác minh bản cài | Preview APK; production autoIncrement | [eas.json](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eas.json:2>) | Cấu hình có hướng nộp APK, chưa có build evidence |
| Testing/format | Chưa có test runner/test suite/Prettier config riêng | — | Không có script test/typecheck trong manifest; tsc vẫn chạy trực tiếp được | [scripts](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:41>) | Không tự coi là thiếu yêu cầu môn; cần smoke test demo |

Theo [tài liệu SDK 58 chính thức](https://docs.expo.dev/versions/v58.0.0/), tổ hợp SDK58/RN0.88/React19.3 là đúng thế hệ, Node tối thiểu 22.13.x; Node hiện tại đáp ứng. Không có lý do hạ SDK chỉ vì nhớ phiên bản cũ. Không viết/sửa Expo API trong audit.

### 2. Toàn bộ dependency ứng dụng và mức sử dụng

Ngoài React, RN, Expo, Router, Axios đã ghi ở trên, bảng này bao phủ các dependency ứng dụng còn lại trong manifest. Cần phân biệt **không import trực tiếp** với **có thể là hạ tầng/peer dependency**; không được xóa hàng loạt chỉ bằng kết quả tìm import.

| Thành phần | Công nghệ | Phiên bản | Vai trò/thực tế sử dụng | File bằng chứng | Đánh giá MMA301 |
|---|---|---|---|---|---|
| Native UI | `@expo/ui` | 58.0.25 | Có cài; không thấy import source ứng dụng | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:6>) | Ứng viên rà soát dư; chưa cần thêm abstraction UI |
| Icon | `@expo/vector-icons` | 15.1.1 | Dùng trong hồ sơ chi tiết; nhiều tab dùng emoji | [profile detail](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:1>) | Hợp lý |
| Slider | `@react-native-community/slider` | 5.2.1 | Các tiêu chí/thói quen/trọng số hồ sơ | [profile edit](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:1>) | Hỗ trợ form, dễ giải thích |
| Constants | `expo-constants` | 58.0.14 | Không thấy import trực tiếp; có thể phục vụ framework | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:11>) | Xác minh peer graph trước khi bỏ |
| Device | `expo-device` | 58.0.5 | Không thấy dùng thông tin thiết bị | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:12>) | Ứng viên dư |
| Font | `expo-font` | 58.0.11 | Không có luồng load font riêng; cần xét icons/framework | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:13>) | Không coi “không import” là đủ để xóa |
| Glass | `expo-glass-effect` | 58.0.5 | Không thấy import trực tiếp; native-tabs chỉ nằm ở starter chưa dùng | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:14>) | Rà soát sau dọn starter |
| Image | `expo-image` | 58.0.18 | Import trong nhóm animated-icon starter; màn nghiệp vụ chủ yếu RN Image | [animated icon](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/animated-icon.tsx:1>) | Có cài/import nhưng chưa phục vụ flow chính |
| Chọn ảnh | `expo-image-picker` | 58.0.10 | Chat, tạo/sửa Pass, avatar/ảnh phòng hồ sơ | [chat](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:98>) | Nâng cao hợp lý, là tính năng thiết bị thật |
| Linking | `expo-linking` | 58.0.15 | Không import trực tiếp; Router cần cơ chế linking; gọi điện dùng RN Linking | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:17>) | Hạ tầng; không xóa chỉ vì không import |
| Secure storage | `expo-secure-store` | 58.0.2 | Token native trong Auth/interceptor/chat | [Auth](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:16>) | Hợp lý; thiếu adapter cho Web |
| Splash | `expo-splash-screen` | 58.0.12 | Plugin app; source import ở starter animated-icon | [app config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json:30>) | Plugin đang có tác dụng dù starter không chạy |
| Status bar | `expo-status-bar` | 58.0.4 | Root layout `style="dark"` | [root](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:10>) | Hợp lý; cần thử độ tương phản nền tối |
| Symbols | `expo-symbols` | 58.0.4 | Starter app-tabs.web | [web tabs](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.web.tsx:9>) | Chưa dùng trong flow chính |
| System UI | `expo-system-ui` | 58.0.7 | Không import trực tiếp; hỗ trợ cấu hình hệ thống/theme | [app config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json:9>) | Xác minh hạ tầng trước dọn |
| Web browser | `expo-web-browser` | 58.0.7 | ExternalLink starter, không có caller từ route | [ExternalLink](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/external-link.tsx:1>) | Chưa có payment browser flow thực tế |
| Web renderer | `react-dom` | 19.3.0 | Nền tảng Web do scripts/config khai báo | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:26>) | Có mục đích nếu giữ Web |
| Gesture | `react-native-gesture-handler` | 3.3.0 | Không import trực tiếp; thư viện hạ tầng native/navigation | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:28>) | Không xác nhận dư chỉ từ import |
| Animation | `react-native-reanimated` | 4.7.1 | Dùng trong animated-icon starter, không reachable từ route hiện tại | [animated icon](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/animated-icon.tsx:1>) | Không cần mở rộng animation architecture |
| Safe area | `react-native-safe-area-context` | 5.10.1 | Shared UI và chat dùng inset | [ui](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:16>) | Thiết thực cho mobile |
| Screens | `react-native-screens` | 4.30.1 | Hạ tầng Router/native screens, không import trực tiếp | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:31>) | Giữ theo dependency framework |
| Web RN | `react-native-web` | 0.21.4; manifest `~0.21.0` | Hạ tầng render Web | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json:32>) | Bản cài khớp khuyến nghị cục bộ `~0.21.4` và nằm trong range manifest |
| Worklets | `react-native-worklets` | 0.13.0 | Starter animation và hạ tầng Reanimated | [animated icon](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/animated-icon.tsx:1>) | Không bỏ riêng lẻ khi còn Reanimated |

Tổng manifest: **28 dependencies + 4 devDependencies**. `package-lock.json` v3 khớp các dependency root; bản cài top-level khớp bản khóa. Không thấy Bun lockfile; repository đang theo npm, nên không chuyển sang bunx tùy ý. Không phát hiện thư viện UI/state/database thứ hai đang tranh nhiệm vụ với một hệ đang chạy; phần chồng lặp chủ yếu là starter theme/tabs và RN Image so với expo-image đã cài.

Không thấy Firebase, ORM, SQL driver, MongoDB client, Maps, GPS/location, camera capture, push notifications, Socket.IO/WebSocket, AI SDK hoặc cổng MoMo/VNPay thật trong luồng source. Tên payment provider trong constants không chứng minh đã tích hợp provider.

## III. Folder Structure & Architecture

### 1. Cây thư mục thực tế

Đã liệt kê cả file ẩn cấu hình có liên quan. Không mở toàn bộ `node_modules`, `.git`, `.expo` hoặc cache; chỉ đọc manifest/type/source dependency có mục đích xác minh cụ thể.

```text
Roomie-Mobile/
├── AGENTS.md
├── README.md
├── LICENSE
├── package.json
├── package-lock.json
├── app.json
├── eas.json
├── tsconfig.json
├── eslint.config.js
├── expo-env.d.ts                     # file sinh tự động, gitignore
├── .gitignore
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── scripts/
│   └── reset-project.js
├── assets/
│   ├── expo.icon/
│   │   ├── icon.json
│   │   └── Assets/{grid.png,expo-symbol 2.svg}
│   └── images/
│       ├── roomie-logo.png,icon.png,splash-icon.png,favicon.png
│       ├── android-icon-{background,foreground,monochrome}.png
│       ├── expo-logo.png,expo-badge.png,expo-badge-white.png
│       ├── react-logo.png,react-logo@2x.png,react-logo@3x.png
│       ├── logo-glow.png,tutorial-web.png
│       └── tabIcons/{home,home@2x,home@3x,explore,explore@2x,explore@3x}.png
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── favorites.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── pass.tsx
│   │   │   ├── connections.tsx
│   │   │   ├── messages.tsx
│   │   │   └── account.tsx
│   │   ├── accommodation/[id].tsx
│   │   ├── pass/[id].tsx
│   │   ├── chat/[id].tsx
│   │   ├── profile/{[id].tsx,edit.tsx}
│   │   └── account/{subscription.tsx,support.tsx}
│   ├── api/
│   │   ├── axios.js
│   │   ├── auth.js
│   │   ├── accommodations.js
│   │   ├── pass.js
│   │   ├── matching.js
│   │   ├── connections.js
│   │   ├── conversations.js
│   │   ├── favorites.js
│   │   ├── notifications.js
│   │   ├── uploads.js
│   │   ├── profile.js
│   │   ├── support.js
│   │   ├── billing.js
│   │   └── admin.js
│   ├── auth/AuthContext.js
│   ├── context/{NotificationContext.js,ThemeContext.tsx}
│   ├── hooks/
│   │   ├── use-infinite-list.ts
│   │   ├── use-theme.ts
│   │   ├── use-color-scheme.ts
│   │   └── use-color-scheme.web.ts
│   ├── components/
│   │   ├── ui.tsx
│   │   ├── cards.tsx
│   │   ├── MessageOwnerButton.tsx
│   │   ├── animated-icon.tsx
│   │   ├── animated-icon.web.tsx
│   │   ├── animated-icon.module.css
│   │   ├── app-tabs.tsx
│   │   ├── app-tabs.web.tsx
│   │   ├── external-link.tsx
│   │   ├── hint-row.tsx
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   ├── web-badge.tsx
│   │   └── ui/collapsible.tsx
│   ├── constants/theme.ts
│   ├── utils/labels.js
│   └── global.css
├── node_modules/                     # chỉ kiểm tra có chọn lọc
├── .expo/                            # generated/cache, có typed routes
└── .git/                             # không audit nội dung object/history
```

Không có `android/`, `ios/`, server/backend directory, `.env` trong workspace đã kiểm kê, `app.config.*`, `babel.config.*`, `metro.config.*`, test directory hoặc tài liệu học phần. Việc không có Babel/Metro custom config không tự nó là lỗi; project dùng mặc định Expo.

### 2. Trách nhiệm và đánh giá kiến trúc

| Nhóm | Trách nhiệm hiện tại | Nhận xét |
|---|---|---|
| `app` | Route, JSX, form state, handler, khá nhiều business logic và styles | Đúng nơi route; chưa tách form lớn nhưng chưa cần tái cấu trúc toàn bộ |
| `api` | Mỗi domain vài hàm Axios, trả `response.data` | API layer đủ mỏng, dễ bảo vệ; screen profile/support/subscription đang bỏ qua wrapper |
| `auth` / `context` | Phiên đăng nhập, badge; ThemeContext không được mount | Có 2 context thực sự hoạt động; theme còn là code thừa |
| `hooks` | Pagination, tab-to-top; theme starter | `useInfiniteList` giúp tái sử dụng; cần sửa race thay vì thay thư viện |
| `components` | UI dùng chung, card, nút mở chat; nhiều starter component | Reuse thực tế tốt; nên bỏ starter ngoài phạm vi sau khi xác minh imports |
| `utils/labels` | Enum labels, money formatting, Pass price text | Đủ đơn giản; một số keys không khớp editor và một số enum chưa được dùng |
| `assets` | Logo/splash thực tế và nhiều ảnh Expo starter | Không phải vấn đề chức năng; có thể dọn để rõ bản sắc sản phẩm |

Quan hệ chính: **Route → local state/custom hook → API wrapper → shared Axios → remote API**; **Auth/Notification Provider → screens**. Không có repository pattern, dependency injection, domain entities, DDD, Clean Architecture hoặc microservices trong source mobile. Không thấy vòng import tĩnh.

Các file lớn, tính cả dòng trống cuối file: [Pass detail khoảng 1.086 dòng](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx>), [Pass tab khoảng 999](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx>), [profile edit khoảng 802](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx>), [profile detail khoảng 611](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx>), [connections khoảng 585](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx>). Phần đáng kể là JSX/styles; không nên đồng nhất “file dài” với lỗi kiến trúc nghiêm trọng.

[ui/collapsible.tsx](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui/collapsible.tsx:42>) thực chất export một bản PassDetailScreen cũ và Segments, không phải Collapsible. Không tìm thấy importer. **Các import `../../api` tại đây vẫn resolve đúng về `src/api`; không có lỗi đường dẫn tương đối ở điểm này.** Vấn đề là tên/vị trí/nội dung thừa.

Import graph không tìm thấy đường từ route tới 19 module sau: 4 module API `admin/billing/profile/support`; animated-icon native/web; app-tabs native/web; external-link; hint-row; themed-text/view; ui/collapsible; web-badge; constants/theme; ThemeContext; use-color-scheme native/web; use-theme. Đây là kết quả static source hiện tại, không phải căn cứ xóa framework peers.

### 3. Cấu trúc tối giản đề xuất

**Giữ nguyên routing và phần lớn cây hiện tại.** Chỉ khi sửa chức năng liên quan mới tách các form đang quá dài:

```text
src/
├── app/                         # giữ toàn bộ routes hiện có
├── api/                         # dùng wrapper thống nhất; dọn export ngoài scope
├── auth/AuthContext.js          # thêm refreshSession nhỏ nếu cần
├── context/NotificationContext.js
├── components/
│   ├── ui.tsx
│   ├── cards.tsx
│   ├── MessageOwnerButton.tsx
│   └── pass/{CreatePassForm.tsx,EditPassModal.tsx}  # tách khi sửa Pass
├── hooks/use-infinite-list.ts
├── constants/colors.ts          # hợp nhất palette đang dùng nếu có ích
├── utils/{labels.js,validation.ts}
└── types/api.ts                 # vài interface/DTO đủ dùng, không tạo nhiều layer
```

Đây chỉ là đề xuất, **chưa tạo/sửa bất kỳ file code nào**. Không cần thêm `screens/` chỉ để chuyển toàn bộ route sang wrapper, không cần class model/ORM/local DB nếu đề không yêu cầu.

## IV. Frontend, Backend & Data Architecture

### 1. Frontend: khởi tạo, navigation và lifecycle

Entry `expo-router/entry` → [RootLayout](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:6>) mount AuthProvider → NotificationProvider → StatusBar + Stack. [Index](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/index.tsx:4>) redirect tới `/(tabs)`, cho phép guest xem nội dung công khai. Tabs có Tìm phòng, Pass, Kết nối, Tin nhắn và Tài khoản. Prop khởi đầu `connections` hiện bị typecheck SDK58 từ chối; chưa chứng minh tab thực tế được chọn đúng khi chạy.

| Screen/route | Đường vào và params | Bảo vệ/trạng thái chính |
|---|---|---|
| `/` | Khi mở app → redirect tabs | Không ép login, hợp lý nếu sản phẩm cho guest |
| `/login` | LoginPrompt, detail yêu thích/liên hệ | Email/password, loading/error; không có register screen |
| `/(tabs)/index` | Tab Tìm phòng | Search/mine/create; mine/create khóa bằng VIP check chưa thống nhất |
| `/(tabs)/pass` | Tab Pass | Room/item/mine/create; API quyết định quyền cuối cùng |
| `/(tabs)/connections` | Tab Kết nối | Matching/received/sent/accepted; guard đăng nhập |
| `/(tabs)/messages` | Tab Tin nhắn | Guard đăng nhập, focus load + polling |
| `/(tabs)/account` | Tab Tài khoản | Guard đăng nhập; user/profile Context |
| `/accommodation/[id]` | AccommodationCard, favorites; `id` | GET detail; contact/favorite theo user |
| `/pass/[id]` | PassCard/favorites; `id`, tùy chọn `edit=true` | Owner actions dựa `isOwner`; edit query chưa gate tương ứng |
| `/profile/[id]` | Matching/connection card; `id`, `data` JSON | Preview rồi GET detail; relation quyết định action |
| `/profile/edit` | Account menu | GET/PUT profile; chưa có guard route/auth đầy đủ tại màn |
| `/chat/[id]` | Conversation list/start conversation; `id`,`name` | `canSend` từ API; chưa guard user null tại render message |
| `/favorites` | Account menu | Guard login; accommodation/pass segments |
| `/account/subscription` | Account menu | API/fallback plans, confirm mutation; không có payment provider flow |
| `/account/support` | Account menu | FAQ API/fallback, accordion; không có form report |

Không thấy business screen chết hoặc button chính hoàn toàn bỏ trống handler. Các chức năng chưa nối được liệt kê ở mục V. Starter AppTabs tham chiếu `/explore` nhưng không được active layout sử dụng: đây là code thừa/type error, **không phải bằng chứng một tab Explore đang hiện rồi crash**.

Các kỹ thuật đang dùng:

- `useState`: form fields, selected tab, query, list, loading/error, mutations.
- `useEffect`: bootstrap auth, profile/detail fetch, image dimensions, polling/listeners. Có active flags ở accommodation detail/profile detail; không phải tất cả effect đều thiếu cleanup.
- `useContext`: phiên và badge; không có global store nặng.
- `useRef`: list scroll, request generation, busy flag, chat cursor, keyboard measurement. Có `useMemo/useCallback` cho derive/callback; chưa thấy memoization enterprise không cần thiết.
- `useFocusEffect`: reload favorites/messages và chat polling khi màn được focus; timer có cleanup nhưng in-flight request chưa luôn được hủy/bỏ kết quả cũ.
- `FlatList`: danh sách chính và chat, kéo refresh, load more; form/detail dùng ScrollView. Gallery là list ngang trong scroll dọc, không coi đó là lỗi nested list cùng hướng.
- KeyboardScreen/keyboard listeners/safe-area inset là hỗ trợ mobile hữu ích; listener keyboard có remove trong cleanup. Edit Pass modal cần kiểm thử keyboard/back/safe-area riêng.
- API errors được hiển thị ở nhiều màn; một số lỗi chỉ nằm EmptyComponent, bị che khi còn items cũ; tạo phòng chỉ console; fallback plans/FAQ đang che trạng thái lỗi.

### 2. Backend và toàn bộ API contract phía client

Máy chủ chính được cấu hình tại [axios:4](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:4>), host HTTPS trên Render, base path `/api`, timeout 60 giây. Không ping/call backend trong audit để tránh side effect dữ liệu/ngữ cảnh tài khoản.

**Không có backend thực thi trong repository này.** Các file API là client wrapper, không phải controllers/routes server. Chưa xác minh được framework/ngôn ngữ server, database, validation server, ownership, authentication implementation, token expiry/revocation, CORS, upload limits, moderation, transaction hay persistence thực tế. Sự tồn tại của HTTP request không chứng minh endpoint đó tồn tại trên server.

| Module / bằng chứng | HTTP methods và endpoint được khai báo | Request / mức nối UI |
|---|---|---|
| [auth](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/auth.js:3>) | POST `/auth/register`, `/auth/login`, `/auth/logout`; GET `/auth/me` | Login `{email,password}` và me dùng; register/logout wrapper chưa dùng |
| [accommodations](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:5>) | GET `/accommodations`, `/accommodations/meta`, `/accommodations/mine`, `/accommodations/:id`; POST collection; PUT detail; PATCH `/:id/status`; DELETE detail | List `{page,limit,q}`; create payload ở dưới; meta/update/status/delete chưa nối UI |
| [pass](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/pass.js:5>) | GET `/pass`, `/pass/mine`, `/pass/:id`; POST collection; PUT detail; PATCH `/:id/status`; DELETE detail | List `{page,limit,q,type}`; tất cả wrapper có caller |
| [matching](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/matching.js:3>) | GET `/matching`, `/matching/:userId` | Query/search/pagination; server trả profile/match/relation; thuật toán không có trong FE |
| [connections](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/connections.js:5>) | POST `/connections`; GET collection theo `type`; POST `/connections/seen`; GET `/connections/summary`; PATCH `/:id/accept`, `reject`, `cancel`; DELETE `/:id`; POST/DELETE `/connections/block/:userId` | Send `{receiverId,message}`; seen `{type}`; block/unblock chưa có caller |
| [conversations](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/conversations.js:5>) | GET `/conversations`; GET `/conversations/:id/messages?since`; POST cùng path messages; POST `/conversations/start` | Text `{text}` hoặc multipart `text`,`images`; start `{userId}`; các wrapper đều dùng |
| [favorites](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/favorites.js:5>) | GET `/favorites?type`; POST `/favorites`; DELETE `/favorites/:targetType/:targetId` | POST `{targetType,targetId}`; UI dùng |
| [notifications](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/notifications.js:3>) | GET `/notifications` | Provider lấy số messages/connections; badge, không phải push |
| [uploads](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/uploads.js:3>) | POST `/uploads/images` | FormData `images`; dùng Pass create/edit; kỳ vọng URL array hoặc `{urls}` |
| [profile](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/profile.js:3>) | GET/PUT `/profiles/me` | Wrapper chưa dùng; editor gọi Axios trực tiếp cùng path |
| [support](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/support.js:3>) | GET `/support/faqs`; POST `/support/reports` | Cả hai wrapper chưa dùng; SupportScreen lại gọi GET `/faqs` |
| [billing](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/billing.js:5>) | GET `/billing/plans`, `/billing/me`; POST `/billing/checkout`; POST `/billing/payments/:paymentId/simulate` | Checkout `{planCode,method}`, simulate `{result}`; cả 4 wrapper chưa nối UI |
| [admin](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/admin.js:5>) | GET `/admin/stats`, `/admin/users`, `/admin/listings`, `/admin/reports`, `/admin/plans`, `/admin/faqs`; PATCH users/reports/plans; POST user plan; PATCH listing moderation; DELETE listing; POST/PUT/DELETE FAQs | 15 wrapper không có caller; không có admin screen. Grant `{planCode,days}`; moderation `{status,note}`; các data khác chuyển nguyên object |
| [SubscriptionScreen trực tiếp](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:78>) | GET `/subscriptions/plans`; POST `/subscriptions/subscribe` | POST `{plan}`; khác hợp đồng billing wrapper; chưa xác minh path đúng |
| [SupportScreen trực tiếp](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:79>) | GET `/faqs` | Kỳ vọng mảng FAQ group; khác wrapper support |

31 wrapper chưa có caller gồm: 15 admin; 4 billing; 2 profile; 2 support; register/logout; block/unblock; 4 accommodation meta/update/status/delete. Không cần triển khai tất cả để đủ môn khi rubric chưa yêu cầu; nên xác định scope rõ và bỏ phần thừa hoặc ghi là dự kiến.

Shared request interceptor đọc SecureStore cho mọi request, gắn Bearer nếu có token. Chưa có response interceptor chuẩn hóa 401, retry/cancellation toàn cục hay runtime schema validation. Refresh token không tự động là yêu cầu bắt buộc; một cơ chế re-login/retry rõ ràng có thể đủ cho project sinh viên. Logout hiện là **local logout**, chưa chứng minh revoke token server.

### 3. Data models và quan hệ

Đây là **shape phía frontend mong đợi**, không phải schema database đã kiểm tra. `?` nghĩa là optional/được UI xử lý có thể thiếu; phần lớn object hiện là `any`.

| Entity | Trường/kiểu được source sử dụng | ID, quan hệ và rủi ro |
|---|---|---|
| Auth/session | `{token:string,user,profile}`; user có `id/_id`, `email`, `currentPlan`, `isLandlord`, `role` | Token local; user/profile RAM. [Auth:18,33](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:18>) |
| Pagination | `{items:any[],page:number,pages:number}` | Hook dedupe bằng `id ?? userId`, chưa `_id`; mine endpoints không truyền page, phải trả đúng shape hoặc cần adapter. [hook:24](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:24>) |
| Accommodation create | `{title:string,description:string,price:number,address:string,contact:string}` | Form chỉ có các field này; chưa có ảnh, tiện ích, cấu trúc địa chỉ chi tiết. [create:214](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:214>) |
| Accommodation detail | `{listing,owner,isOwner:boolean,contactPhone?,isFavorite:boolean}`; listing gồm title, images[], price, description, `address:{street,ward,district,city}`, roomType, area, maxOccupants, deposit, availableFrom, `extraCosts:{electricity,water,internet,other}`, amenities[], rentalTerms, status | Owner `{userId,displayName}`. Create address string/detail address object cần xác minh server mapping. [detail:100](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:100>) |
| Pass common | `id/_id`, `type:'room'/'item'`, title, description, `price:number/null`, area?, contact?, images:string[], status active/completed/closed, moderationStatus | User sở hữu do server trả `isOwner`; hai biến thể room/item dùng chung object là đủ gọn, nhưng chưa có typed DTO union chặt chẽ. [create:435](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:435>) |
| Pass room | `roomInfo:{address,deposit:number/null,remainingLeaseMonths:number,availableFrom:string/null,landlordAgreed:boolean,transferTerms?}` | Không có bằng chứng transaction hay booking; đây là listing chuyển nhượng. [create:443](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:443>) |
| Pass item | `itemInfo:{category,condition,dealType}` với enum labels | price=0 khi give_away; null là thỏa thuận. [labels:40](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/labels.js:40>) |
| Profile editor | displayName, avatarUrl, bio, gender, birthYear, school, occupation, isSearching, city, districts:string[], minBudget/maxBudget:number, roomImages:string[], sleepTime/wakeTime/scheduleType, cleanliness/noiseTolerance/privacyNeed:number, guestFrequency/commonSpaceUse, smoking/petFriendly:boolean, hobbies:string[], requirements:string, weights, privacySettings | Nhiều field nhưng phục vụ matching; vấn đề chính là contract/enum, không mặc định quá nhiều field là sai. [payload:187](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:187>) |
| Weights/privacy | 8 nhóm weight `{value:number,strict:boolean}`; 6 boolean showSchool/showOccupation/showBudget/showSchedule/showHobbies/showRoomImages | Chưa xác minh backend có dùng và enforce privacy. Keys commonSpace/hobbies khác labels sharedSpace/interests. [state:58](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:58>) |
| Profile viewer/matching | `{profile,match,relation}`; profile đọc `budget:{min,max}`, locations:string[], schedule, lifestyle, roomPhotos:string[], interests:string[], requirements:string[] | Khác DTO editor; nếu backend không map, mất hiển thị hoặc `.join` sai kiểu. [viewer:152](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:152>) |
| Connection | id, status, unseen, `user:{userId,displayName,avatarUrl,age}`, matchScore?, message? | Connection id dùng accept/reject/cancel; user id dùng send/start chat, không được hoán đổi. [actions:469](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx:469>) |
| Conversation | id, `other:{displayName,avatarUrl}`, unread, `lastMessage:{text,sentAt}` | Conversation id là route chat, không phải user id. [messages:78](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/messages.tsx:78>) |
| Message | `_id`, senderId, text, images:string[], createdAt; response `{messages,canSend}` | Dedup `_id`, cursor createdAt; chưa xác minh ordering/since semantics server. [chat:61](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:61>) |
| Favorite | `{targetType:'accommodation'/'pass',targetId}`; list `{items:[listing...]}` | Quan hệ user–listing nằm phía API; FE chỉ mutation/read. [favorite API](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/favorites.js:5>) |
| Notification | `{messages:number,connections:number}` | Chỉ số badge; không có push token/device registration. [provider:19](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/NotificationContext.js:19>) |
| Plan view model | key, name, priceText, period?, subText, features:[{label,value}], highlight? | Đây là shape UI và fallback; chưa chứng minh schema billing server. [plans:33](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:33>) |
| FAQ view model | `[{category,items:[{id,question,answer}]}]` | API có thể dùng shape khác; screen chỉ nhận mảng. [support:77](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:77>) |

Không có model database quan hệ/foreign key thực thi ở mobile. Quan hệ suy ra từ UI là User–Profile, User–Listing, Connection giữa hai User, Conversation–Message, User–Favorite–Listing, User–Plan. Không suy ra cardinality/unique constraint của server chưa xem được.

### 4. Nguồn dữ liệu, CRUD, persistence và đồng bộ

| Nguồn | Dữ liệu/CRUD | Luồng và tồn tại sau đóng app | Tính nhất quán/bảo mật |
|---|---|---|---|
| SecureStore native | Key `token`; đọc bootstrap/interceptor/chat, ghi login, xóa logout hoặc bootstrap401 | Login → setItem → request Bearer; mở app lại đọc token → `/auth/me` | Dùng đúng mục đích credential nhỏ; không có refresh/retry UX toàn cục; chưa hỗ trợ Web |
| Remote REST API | Auth, profile, listings, matching, connections, chat, favorites, badges, uploads, plans/FAQ | UI → wrapper/Axios → server → state → render; FE có các request CRUD nêu trên | Chưa kiểm chứng server lưu bền, authorization, validation, privacy hay DB engine; không đủ bằng chứng gọi là lỗi backend |
| State RAM | Form, list, recentCreated, query/tab, message cache, counts, user/profile | Mất khi process bị đóng; state không phải database | Cache chưa gắn session đầy đủ; Context stale sau save; không có offline queue/conflict resolution |
| Static constants/fallback | Labels, enums, FAQ mặc định, giá/quota gói | Có trong bundle; vẫn hiển thị khi API lỗi | Không phải dữ liệu online; cần ghi rõ fallback và tránh giá/quota trái server |
| URI ảnh thiết bị | ImagePicker assets trong profile/Pass/chat | URI chỉ trỏ file/cached asset; Pass/chat chuyển FormData; profile hiện chỉ gửi chuỗi | Không dùng URI thiết bị làm URL ảnh lưu chung; file cache không phải persistence server |
| Assets tĩnh | Logo/splash/ảnh starter | Bundle/config | Không có dữ liệu người dùng trong assets được kiểm kê |

Theo [SecureStore SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), native storage phù hợp giữ token; thư viện không cung cấp cùng API storage trên Web. Interceptor hiện gọi SecureStore vô điều kiện, nên code path Web sẽ reject trước HTTP theo implementation dependency đã kiểm tra; chưa chạy browser để quan sát trực tiếp.

Đồng bộ hiện tại là **refetch/optimistic state/polling**, không phải realtime socket:

- Badge: 10 giây khi AppState active, có clear interval/listener; in-flight response chưa gắn session.
- Conversation list: 10 giây khi focus; chat: 4 giây khi focus, `since` incremental, dedup messages.
- Detail và favorites refetch theo effect/focus; list có pagination/refresh.
- Không có local database/cache nghiệp vụ bền vững, đồng bộ offline hoặc background push. Đây chỉ là thiếu tính năng nếu rubric/đề bài thực sự yêu cầu.

### 5. Cấu hình và Android build readiness

| Hạng mục | Hiện trạng/bằng chứng | Đánh giá |
|---|---|---|
| App identity | Roomie; Android package và iOS bundle `com.roomie.mobile`; scheme `roomiemobile`; portrait | Có cấu hình rõ tại [app.json:3](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json:3>) |
| Native directories | Không có ios/android, gitignore cả hai | Phù hợp CNG; không cần tự tạo/sửa native folder |
| Plugins | Router, splash, SecureStore, ImagePicker | Config parse thành công; chưa xác minh build native |
| Permission khai báo | Photos permission message; public config resolve thêm `android.permission.RECORD_AUDIO` | Mặc định plugin ImagePicker thêm microphone permission; app hiện chỉ chọn ảnh, nên cân nhắc tắt microphonePermission nếu không dùng. Không tự sửa config |
| Quyền photo library | Profile chủ động request quyền; Pass/chat mở picker chọn ảnh | Theo [ImagePicker SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/), mở thư viện chỉ chọn ảnh không bắt buộc request quyền thủ công. Không gán việc thiếu request ở Pass/chat là bug |
| EAS preview | distribution internal, android buildType apk | Có hướng build APK tại [eas:7](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eas.json:7>); chưa có APK/build log |
| EAS production | autoIncrement; remote appVersionSource | Chưa kiểm chứng tài khoản, credentials, project association; không thấy owner/projectId trong public config. Thiếu bằng chứng liên kết không đồng nghĩa build chắc chắn thất bại |
| Development build | Không có profile development hay expo-dev-client | Không bắt buộc cho APK preview; nếu cần development client mới bổ sung theo nhu cầu, không coi là P0 |
| OTA | Không thấy expo-updates/update URL/runtimeVersion/channel config | Chưa triển khai OTA; không bắt buộc nếu đề không yêu cầu |
| Environment | SERVER_URL hardcode; không thấy `.env`/process.env cấu hình endpoint | Host công khai không phải secret; nên tập trung một cấu hình để tránh lệch host chat |
| Secrets | Không phát hiện mật khẩu/token/API secret literal trong source đã đọc; credentials runtime đến từ login | Không in giá trị credential. Không audit server hoặc lịch sử git, nên không chứng minh “không có secret ở mọi nơi” |
| Network release | Backend chính HTTPS; riêng chat ảnh relative dùng HTTP host khác | Có nguy cơ ảnh hỏng/cleartext bị chặn trên Android; sửa URL thay vì mở rộng cleartext toàn app |
| Theme | userInterfaceStyle light, screen UI nền tối, StatusBar dark | Có thể lệch màu system bars; cần kiểm tra thiết bị, không kết luận crash |
| Toolchain | Local npm dependency graph tốt; lint/typecheck fail | Đã chạy hai kiểm tra theo AGENTS; khuyến nghị sửa failures trước chốt bản |

Không chạy EAS build, expo prebuild/export, expo-doctor tải mới, emulator hoặc APK. Không có bằng chứng release signing, network permission cuối cùng trong merged manifest, image upload từ APK, Android Back hoặc cold start trên thiết bị. **Không kết luận APK hoạt động chỉ từ source/config.**

## V. Feature & User Flow Inventory

**Quy ước trạng thái:** “Đủ luồng source” nghĩa là đã thấy UI → handler → API/state và xử lý kết quả cơ bản, **runtime vẫn chưa kiểm chứng**. “Một phần” nghĩa là có logic nhưng còn nhánh thiếu/sai hoặc contract chưa xác minh. Không có chức năng nào trong bảng được xác nhận đã chạy thành công trên APK trong phiên audit này.

### 1. Chức năng đã nối trong source

| Chức năng | Screen / bằng chứng | Luồng xử lý | Data source | Trạng thái | Thiếu sót / điều kiện thành công, thất bại |
|---|---|---|---|---|---|
| Guest browsing | [entry:4](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/index.tsx:4>), [tabs](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx:47>) | Mở app → redirect tabs → public listings; một số khu vực private dùng LoginPrompt | API public + RAM | Đủ luồng source | Cần backend cho GET public; Pass mine/create chưa có guard UI riêng; guest entry là quyết định thiết kế, không mặc định lỗi |
| Đăng nhập | [login:35](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/login.tsx:35>) | Nhập → Auth.login → POST login → token/user/profile → SecureStore + Context → replace tabs | Auth API, SecureStore | Đủ luồng source | Thành công cần token; thiếu token/HTTP error có thông báo; chưa validate rỗng/email và keyboard submit chưa guard loading |
| Khôi phục phiên | [Auth:13](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:13>) | Mở app → đọc token → GET me → set user/profile → hết loading | SecureStore + API | Một phần | 401 xóa token; mạng lỗi giữ token nhưng UI thành guest, chưa có retry/error auth rõ |
| Đăng xuất | [Auth:43](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:43>) | Account logout → delete token → clear user/profile → LoginPrompt | SecureStore + RAM | Đủ local flow | Không gọi logout API; chưa chứng minh revoke server; các cache screen chưa reset theo session đầy đủ |
| Tìm phòng | [room list:76](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:76>) | Search submit → q → pagination hook → GET accommodations → FlatList; refresh/loadMore | API | Đủ luồng source | Phải đúng `{items,page,pages}`; lỗi load more có thể bị che nếu list còn items |
| Tin phòng của tôi | [room tabs:98](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:98>) | Chọn mine → VIP check → GET mine → cards | Auth + API | Một phần | VIP check không đọc currentPlan; chưa có edit/status/delete UI dù wrapper có |
| Tạo tin phòng | [create room:199](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:199>) | Form → kiểm title/address → POST accommodations → chọn mine | API | Một phần | Chưa upload ảnh/field chi tiết; address DTO cần kiểm chứng; validation số và feedback lỗi thiếu |
| Xem phòng, gọi liên hệ | [room detail:61](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:61>), [tel:222](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:222>) | Card → GET detail → Gallery/thông tin; user có contact → RN Linking `tel:` | API + dialer thiết bị | Đủ luồng source | Cần contact hợp lệ/dialer; chưa catch lỗi openURL; error detail chưa reset khi reload |
| Tìm Pass phòng/đồ | [Pass list:82](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:82>) | Tab/type/search → GET pass → hook → trộn recentCreated → list/cards | API + RAM cache | Một phần | Cache recent chưa theo q/tài khoản; không phải bằng chứng server đã công khai bài mới |
| Tin Pass của tôi | [mine API:84](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:84>), [owner list:232](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:232>) | Chọn mine → myPassApi → list + moderation label → mở edit hoặc confirm delete | API + recentCreated | Một phần | Không có guard guest riêng; cache chưa theo user và nhãn pending sai; server authorization chưa kiểm chứng |
| Tạo Pass | [Pass create:293](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:293>) | Room/item form → picker ≤8 → upload multipart → URL[] → POST pass → recentCreated/tab | API upload + listing | Một phần | Có upload thật trong code; validation còn sau upload, lỗi ngày/số; moderation message chưa đúng |
| Xem Pass | [Pass detail:99](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:99>) | Card → GET detail → listing/owner/contact/isOwner → Gallery/thông tin room/item | API | Đủ luồng source | Backend cần response đúng shape; error cũ có thể chặn lần reload thành công |
| Sửa Pass | [edit modal:480](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:480>) | Owner edit hoặc edit query → form → upload ảnh mới → PUT pass → alert/reload | API | Một phần | Query chưa gate isOwner; modal thiếu Android Back callback; validation/upload order cần sửa |
| Xóa/đổi trạng thái Pass | [owner actions:126](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:126>) | Confirm → DELETE → back; hoặc PATCH active/completed/closed → reload | API | Đủ luồng source | Có catch/busy; quyền owner cuối cùng phải do backend kiểm tra, chưa xác minh |
| Yêu thích | [room favorite:79](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:79>), [Pass:115](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:115>) | Guest → login; user → optimistic fav → POST/DELETE → giữ/rollback | Favorites API | Đủ luồng source | Chưa khóa mutation liên tiếp; rollback silent, race có thể làm lệch UI |
| Danh sách tin đã lưu | [favorites:18](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/favorites.tsx:18>) | Focus/type → GET favorites → FlatList → detail; pull refresh | API | Đủ luồng source | Không thấy pagination screen; đổi type/session có thể response cũ ghi đè; error chỉ khi empty |
| Gợi ý roommate | [matching:101](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx:101>) | Search → GET matching → score/profile cards → profile hoặc send request | API matching | Đủ luồng source | Điểm/thuật toán server chưa xem được; chưa có căn cứ gọi là AI; profile incomplete có nhánh lỗi |
| Xem hồ sơ/độ phù hợp | [profile detail:109](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:109>) | `data` JSON preview → parse → GET match detail → merge ưu tiên API → score/breakdown/profile | Route preview + API | Một phần | Có parse catch/active guard; DTO editor/viewer và privacy cần xác minh |
| Gửi yêu cầu kết nối | [profile send:190](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:190>), [matching send:117](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx:117>) | User action → POST connections receiverId → sent state/alert | API + RAM | Đủ luồng source | Thành công theo response; quota/duplicate validation server chưa xác minh |
| Nhận/chấp nhận/từ chối/hủy/ngắt kết nối | [connections:469](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx:469>) | List received/sent/accepted → seen → accept/reject/cancel/delete → reload summary/badge | API connections | Một phần | Màn Connections có đúng handlers; nút accept trên Profile gọi nhầm send |
| Mở cuộc hội thoại | [MessageOwnerButton:12](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/MessageOwnerButton.tsx:12>), [profile chat:207](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:207>) | POST start userId → conversationId → router chat id/name | API | Đủ luồng source | Có busy/catch; eligibility do server, chưa xác minh quyền chat qua listing/connection |
| Danh sách chat | [messages:23](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/messages.tsx:23>) | Focus + poll10s → GET conversations → unread/lastMessage → chat | API + RAM | Đủ luồng source | Có refresh/empty/error; không clear cache theo user; in-flight overlap chưa guard |
| Chat text/ảnh | [chat fetch:71](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:71>), [send:109](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:109>) | Poll4s since → merge/dedup → inverted list; text/≤4ảnh → JSON/FormData POST → merge → clear form | API + picker | Một phần | Có sending/canSend/error; ảnh origin/token sai, cursor/race/auth guard cần sửa hoặc kiểm chứng |
| Badge thông báo | [NotificationProvider:17](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/NotificationContext.js:17>) | Session non-admin → active poll10s/AppState → counts → tab badges | API notifications | Đủ luồng source | Không phải push; callback cũ có thể cập nhật sau logout, lỗi API bị bỏ qua |
| Account | [account:9](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/account.tsx:9>) | Context → avatar/name/email/plan/landlord → menu và logout | Auth Context | Đủ luồng source | Hiển thị snapshot cũ sau sửa hồ sơ/nâng gói vì chưa refresh Context |
| Chỉnh hồ sơ, weights/privacy | [profile edit:125](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:125>) | GET me → local fields → picker/sliders/switches → PUT → alert/back | API + picker | Một phần | Thiếu upload, contract/enum chưa thống nhất; GET fail vẫn save defaults; enforcement matching/privacy server chưa biết |
| Xem gói | [subscription:75](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:75>) | GET subscriptions/plans → mảng hợp lệ hoặc DEFAULT_PLANS → cards | API hoặc static | Một phần | Không biết đang fallback; path/shape khác billing service; giá/quota chưa xác minh server |
| Nâng/gia hạn gói | [subscription:90](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:90>) | Check rank → confirm “Thanh toán” → POST subscribe → alert | API | Một phần | Catch vẫn báo đã gửi; chưa update currentPlan; chưa có checkout/provider/status/history UI |
| Trung tâm hỗ trợ | [support:77](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:77>) | GET faqs hoặc default → nhóm accordion LayoutAnimation → contact card | API hoặc static | Một phần | Contract khác wrapper, hotline placeholder, FAQ mô tả report chưa có nút thực tế |

### 2. Các luồng chính theo từng bước

1. **Login:** User nhập email/password → LoginScreen.submit → AuthContext.login → POST `/auth/login` → server trả token/user/profile → SecureStore token + setUser/setProfile → router.replace tabs → UI Account/badge theo session. Khi request reject hoặc thiếu token, LoginScreen hiện lỗi; chưa có validation trước request.
2. **Mở lại app:** AuthProvider effect → đọc SecureStore → GET `/auth/me` → cập nhật Context → UI private. Khi mất mạng, token giữ nhưng user chưa khôi phục; chưa có trạng thái “không xác minh được phiên”/Retry riêng.
3. **Tìm phòng/Pass:** User submit search → screen setQ → useInfiniteList → GET list page/limit/filter → API server, database chưa xác minh → setItems/page/pages → FlatList → card/detail. Refresh/loadMore dùng cùng hook; race nêu ở mục VII.
4. **Tạo Pass:** User điền room/item + chọn ảnh → CreatePassForm → uploadImagesApi multipart → server trả URLs → createPassApi payload chung + roomInfo/itemInfo → remote storage chưa xác minh → recentCreated + đổi tab → card xuất hiện. Card local xuất hiện không chứng minh moderation approved hoặc dữ liệu tồn tại sau restart.
5. **Sửa hồ sơ hiện tại:** User mở editor → GET `/profiles/me` → set nhiều local state → picker giữ URI local → PUT JSON profile → server → alert/back. Hai bước còn thiếu là upload ảnh thành URL và đồng bộ lại Context; contract cần xác minh.
6. **Kết nối:** User xem matching → GET `/matching` → mở Profile bằng id/data → GET match detail → send POST `/connections` → sent state; phía người nhận ở Connections → PATCH `/:connectionId/accept` → reload list/summary/badge → accepted UI. Nhánh accept trong Profile đang gọi sai POST send.
7. **Chat:** User nhấn nhắn tin → POST `/conversations/start` `{userId}` → route conversationId → GET messages/`since` → merge `_id` → list; send text JSON hoặc ảnh multipart → response message → merge → clear input → UI. Cursor và URL ảnh cần sửa/kiểm chứng.
8. **Yêu thích:** User toggle → detail local fav đổi ngay → POST/DELETE favorites → server → giữ hoặc rollback UI; Account → Favorites → GET theo type → cards. Đây là lưu trên API, không phải AsyncStorage.
9. **Gói dịch vụ:** User chọn gói → SubscriptionScreen → GET plans hoặc fallback → confirm → POST subscribe → server → alert. Hiện cả success và failure đều có thông báo tích cực; chưa có bằng chứng payment transaction thật.

### 3. Thành phần chưa thành chức năng mobile

| Thành phần | Hiện trạng thực tế | Không được khẳng định |
|---|---|---|
| Register | Wrapper POST register; login chỉ hướng dẫn đăng ký trên web, chưa có link/màn mobile | “Đăng ký tài khoản trong app đã hoàn chỉnh” |
| Logout server | Wrapper có nhưng local logout không gọi | “Token đã bị thu hồi trên server” |
| Quản lý accommodation đầy đủ | Có update/status/delete wrappers; mobile chỉ list/mine/create/detail | “CRUD phòng trọ đầy đủ trên mobile” |
| Report | Wrapper + labels + FAQ mô tả; chưa thấy report action/form | “Báo cáo vi phạm hoạt động trong app” |
| Block/unblock | 2 wrappers, chưa có caller | “Chặn người dùng đã có UI” |
| Admin | 15 wrappers, không admin route/UI | “Ứng dụng có trang quản trị” |
| Billing/payment simulation | Wrapper checkout/simulate và constants payment providers; UI không gọi | “Đã tích hợp MoMo/VNPay/ZaloPay hoặc payment gateway” |
| Camera/location/maps/push/AI | Không có luồng thực hiện trong source | “Đã có các tính năng thiết bị/AI này” |
| Theme switching | ThemeContext có toggle nhưng không mount/caller từ route | “App đã hỗ trợ đổi sáng/tối theo người dùng” |

Không tự biến các mục này thành yêu cầu bắt buộc. Chỉ bổ sung nếu đề/rubric hoặc phạm vi nhóm đã cam kết yêu cầu; nếu không, ghi rõ không nằm trong bản mobile.

## VI. MMA301 Compliance Matrix

### 1. Tình trạng nguồn đối chiếu

| Nguồn theo ưu tiên | Kết quả tìm kiếm | Có thể dùng để kết luận gì? |
|---|---|---|
| Đề bài/rubric cuối kỳ do người dùng cung cấp | Chưa có nội dung đề/rubric; prompt hiện tại là yêu cầu audit | Không xác định tính năng bắt buộc hoặc cách tính điểm |
| Slide/lab/assignment/syllabus trong workspace/đính kèm | Không tìm thấy; không có PDF/DOCX/PPTX/XLSX học phần ngoài dependencies | Chưa xác minh nội dung từng buổi, yêu cầu JS/TS, Expo/native, DB hoặc backend |
| Quy tắc repository | [AGENTS.md](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/AGENTS.md>) yêu cầu Expo docs theo SDK, Router trong src/app, lint/typecheck | Xác minh được quy tắc kỹ thuật của workspace; không đại diện syllabus MMA301 |
| Tài liệu kỹ thuật chính thức | Expo SDK58/index, Router, SecureStore, ImagePicker, RN Modal | Đánh giá đúng API/nền tảng, không tạo curriculum MMA301 mới |
| Best practices | Dùng để ưu tiên fix race, validation, contract, error UX, bảo trì | Tiêu chí tham khảo, không gọi là yêu cầu giảng viên khi chưa có rubric |

### 2. Ma trận đối chiếu

Các nhãn “phù hợp”/“nâng cao hợp lý” dưới đây là **đánh giá kỹ thuật tạm thời** khi áp dụng cho project sinh viên. Với nội dung học phần cụ thể, trạng thái vẫn là **chưa đủ căn cứ** nếu chưa có tài liệu xác nhận.

| Kiến thức/yêu cầu MMA301 | Cách project triển khai | Bằng chứng | Phân loại | Nhận xét |
|---|---|---|---|---|
| Kiến trúc mobile | RN components + Context + API layer mỏng | [root](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:6>), [api](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:6>) | Phù hợp về kỹ thuật; học phần chưa đủ căn cứ | Không có enterprise pattern dư; nên giữ |
| Tổ chức source | Route ở src/app, code dùng chung ở components/hooks/api | [route layout](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx:22>) | Phù hợp quy tắc AGENTS; syllabus chưa xác minh | Dọn starter và tách form lớn từng phần là đủ |
| Components/props | Cards, Gallery, Loading, Segments, MessageOwnerButton | [cards](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:33>), [button](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/MessageOwnerButton.tsx:1>) | Phù hợp kỹ thuật nền tảng | Có reuse thật và props; cần giải thích được dữ liệu đầu vào |
| State/hooks | useState/effect/ref/context/callback/memo, custom pagination | [hook](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:6>) | Phù hợp; custom hook nâng cao hợp lý | Sửa race/cleanup; không cần thay bằng Redux |
| Navigation/lifecycle | File routes Stack/Tabs, params, focus effect | [Stack](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:11>), [chat focus](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:90>) | Router hợp lý, tuân thủ AGENTS; API type chưa phù hợp bản cài ở một số chỗ | Sửa tabs/ref/types; không mặc định Router sai vì nâng cao |
| Async/API | Axios + async/await/Promise, loading/error, multipart | [conversations API](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/conversations.js:10>) | Phù hợp kỹ thuật | Có thực hành mạng; contract/error UX còn thiếu |
| Form/validation | Controlled inputs, sliders, switches, handler validation | [profile save](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:184>) | Có triển khai; chưa đủ về chất lượng | Không cần form framework; cần số/ngày/enum và trạng thái load hợp lệ |
| Data models | Object có trường type room/item; payload phần lớn any | [Pass payload](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:548>) | Cấu trúc đủ đơn giản; contract chưa phù hợp nội bộ | Nên thống nhất DTO, không áp class/DDD |
| Local persistence | SecureStore token | [Auth](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:38>) | Nâng cao hợp lý; yêu cầu DB local chưa đủ căn cứ | Không thể coi token storage là CRUD database nghiệp vụ nếu rubric đòi DB |
| Database/backend | API từ server ngoài repo | [SERVER_URL](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:4>) | Chưa đủ căn cứ | Không ép làm backend/SQLite/Firebase mới khi chưa có yêu cầu |
| CRUD nghiệp vụ | Pass có create/read/update/delete/status; accommodation mobile chỉ create/read/mine | [Pass service](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/pass.js:5>) | Có bằng chứng CRUD client; persistence runtime chưa kiểm chứng | Chưa biết rubric đòi CRUD entity nào/số lượng bao nhiêu |
| Authentication/authorization | Bearer + SecureStore + UI guards/isOwner | [Auth](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:32>), [Pass owner](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:245>) | Nâng cao hợp lý; auth server chưa kiểm chứng | UI không thay server authorization; sửa token ảnh và session cache |
| Device features | Photo picker, safe area, keyboard, mở dialer | [picker](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:98>), [tel](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:222>) | Hợp lý; yêu cầu feature cụ thể chưa đủ căn cứ | Không tự bổ sung GPS/camera/push chỉ để nhiều công nghệ |
| Chat/badge polling | 4s/10s, focus/AppState | [chat](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:90>), [badge](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/NotificationContext.js:29>) | Nâng cao nhưng hợp lý | Dễ giải thích hơn socket cho phạm vi nhỏ; cần chống overlap/cursor loss |
| Matching weights/privacy | Form nhiều tiêu chí, viewer score/breakdown, API matching | [weights](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:58>), [matching service](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/matching.js:3>) | Nâng cao có mục đích; chưa kiểm chứng thuật toán/enforcement | Giữ nếu nhóm hiểu và server hỗ trợ; không gọi AI không có bằng chứng |
| TypeScript | TSX strict + API/Auth JS any | [tsconfig](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/tsconfig.json:4>) | Nâng cao hợp lý | Không cần đổi toàn bộ sang JS; phải sửa diagnostics và biết giải thích types |
| React Compiler/native-tabs animation starter | Compiler bật config; native-tabs/animation code không reachable | [experiments](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json:45>), [starter tabs](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.tsx:1>) | Compiler là tùy chọn; phần starter không cần cho chức năng hiện tại | Đơn giản hóa code thừa; không khẳng định compiler gây bug khi chưa có bằng chứng |
| Admin/billing abstractions chưa dùng | API exports/constants nhiều hơn UI thật | [admin](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/admin.js:5>), [billing](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/billing.js:5>) | Không cần thiết trong bản mobile nếu ngoài scope | Đây là code thừa hơn là kiến trúc nâng cao; không phải chức năng đã hoàn thành |
| Android config/build | Package/plugins/EAS APK profile có; chưa build APK | [app config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json:15>), [EAS](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eas.json:7>) | Chưa đủ căn cứ về readiness | Cần build/install/demo thực tế sau sửa; không tự kết luận fail hay pass APK |
| Lint/typecheck theo AGENTS | Đã chạy đủ theo yêu cầu, kết quả đều fail | [lint config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eslint.config.js:5>) và kết quả mục VII | Đã thực hiện yêu cầu chạy; chưa đạt kiểm tra chất lượng | Sửa failures là khuyến nghị kỹ thuật trước nộp; chưa biết cách tính điểm trong rubric |
| Chức năng bắt buộc, yêu cầu nộp | Không có rubric/đề để map | Kết quả tìm tài liệu mục I/VI | Chưa đủ căn cứ; chưa xác định “Thiếu” bắt buộc | Cần bổ sung rubric rồi map từng tiêu chí; không tự tạo yêu cầu |

Không có căn cứ gắn nhãn “Chưa phù hợp MMA301” cho Expo/TS/Router, cũng chưa có căn cứ xác định một tính năng bắt buộc của môn đang hoàn toàn thiếu. Những lỗi được xác minh trong mục VII là **lỗi kỹ thuật hiện trạng**, không phải suy đoán chương trình môn học.

## VII. Problems & Missing Requirements

### 1. Cách đọc mức ưu tiên

- **Lỗi thực tế:** có thể chứng minh từ source hoặc output kiểm tra; chưa đồng nghĩa đã tái hiện trên APK.
- **Nguy cơ cần kiểm chứng:** có code path/kịch bản cụ thể, nhưng tác động phụ thuộc runtime, dữ liệu hoặc backend.
- **Cải thiện:** nợ bảo trì/UX; không mặc định bắt buộc để đạt môn.
- “Trước nộp: Có” là khuyến nghị kỹ thuật để bản mobile đáng tin cậy; **không phải khẳng định rubric bắt buộc**. AGENTS yêu cầu chạy lint/typecheck, đã thực hiện; không có câu riêng trong AGENTS quy định exit code bắt buộc. Các mục conditional ghi rõ điều kiện.

**P0:** chưa xác minh lỗi nào khiến app không chạy/build, mất dữ liệu nghiêm trọng hoặc chặn tính năng bắt buộc đã biết. Không có APK/runtime/rubric để kết luận rộng hơn.

### 2. Bảng vấn đề, từ nghiêm trọng đến ít nghiêm trọng

| ID / ưu tiên | Loại và bằng chứng file:dòng | Mô tả / nguyên nhân | Ảnh hưởng thực tế hoặc điều kiện | Cách sửa đề xuất | Bắt buộc trước nộp? |
|---|---|---|---|---|---|
| **P1-01** | **Lỗi kiểm tra:** [Tabs:26](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx:26>), [UI ref:55](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:55>), [starter tabs:8](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.tsx:8>), [web:27](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.web.tsx:27>), [theme:11](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-theme.ts:11>) | **13 TypeScript diagnostics**: prop tabs không thuộc type bản cài; ref/measure type sai; null scheme và so sánh unspecified; typed route `/explore` không tồn tại; ref web không khớp | Không đạt typecheck; một phần là active shared UI, một phần starter không chạy. Chưa chứng minh APK fail | Sửa theo SDK58/RN types; bỏ starter thật sự không dùng hoặc sửa đúng; dùng null fallback; không tắt strict/ts-nocheck để che lỗi | **Có**, khuyến nghị chất lượng trước chốt bản |
| **P1-02** | **Lỗi kiểm tra:** [JSX:577](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:577>), [lint config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eslint.config.js:5>), [effect badge:26](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/NotificationContext.js:26>), [pagination:49](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:49>) | **16 lint errors, 4 warnings**; import alias resolver, JSX apostrophes, 3 set-state-in-effect rules; warning deps/unused/BOM/Axios | Không đạt lint. Resolver error không chứng minh file alias thật sự không tồn tại/Metro sẽ fail; rule effect không tự chứng minh infinite loop | Sửa JSX/config resolver theo toolchain; xem từng effect đúng mục đích, tránh disable rules toàn repo; dọn cảnh báo hợp lý | **Có**, khuyến nghị chất lượng trước chốt bản |
| **P1-03** | **Lỗi source + nguy cơ bảo mật:** [chat:167](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:167>), [headers:176](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:176>), [server:4](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:4>) | Relative image ghép `http://1.1.1.1:5000`; Bearer gắn cả URL absolute bất kỳ | Ảnh relative dùng sai origin, có thể bị chặn cleartext; **nguy cơ** token truyền tới host khác/qua HTTP nếu request diễn ra. Chưa chứng minh token đã lộ | Dùng imageUrl/URL resolver chung; chỉ gắn token với HTTPS origin backend được tin cậy và thật sự cần auth | **Có** |
| **P1-04** | **Thiếu bước trong flow:** [avatar:96](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:96>), [room image:121](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:121>), [payload:189](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:189>), [PUT:223](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:223>) | URI picker được gửi trong JSON profile, không upload bytes | Với URI file/content cục bộ, server/điện thoại khác không truy cập được ảnh; server từ chối hay lưu chuỗi chưa biết | Reuse uploadImagesApi; upload asset mới, giữ URL cũ hợp lệ, chỉ PUT URL server trả về | **Có nếu giữ chức năng chọn ảnh hồ sơ** |
| **P1-05** | **Lỗi handler:** [profile accept:447](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:447>), [send handler:193](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:193>), [accept đúng:474](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx:474>) | Nút accept gọi sendRequestApi, setSentSuccess thay vì accept connection | Nhánh received chuyển UI sang sent/báo đã gửi. Backend có tự accept POST ngược hay không chưa biết, nhưng intent và UI state đang sai | Handler accept riêng với connectionId; refresh relation/badge. Nếu thiếu id thì dẫn tới danh sách received đã có accept đúng | **Có** |
| **P1-06** | **Lỗi logic:** [subscription:120](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:120>), [catch:125](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:125>) | Mọi request reject vẫn báo “Đã gửi yêu cầu” | Timeout/401/404/500 bị trình bày như đã gửi thành công; người dùng/demo không biết thao tác thất bại | Catch báo lỗi thật; chỉ confirm khi response hợp lệ, xác minh contract, refresh session sau success | **Có nếu giữ luồng gói** |
| **P1-07** | **Bất nhất source; tác động theo contract:** [VIP:50](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:50>), [Account plan:41](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/account.tsx:41>), [gói:29](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:29>) | Check VIP đoán tier/plan/package/role/subscription bằng substring nhưng bỏ currentPlan | Với user chỉ có currentPlan=plus/pro, mine/create phòng bị khóa; substring có thể nhận nhầm. Chưa biết backend có các field thay thế khác | Xác minh User DTO rồi dùng enum field chính thức và entitlement rõ; không để UI check thay authorization server | **Phải xác minh trước demo Plus/Pro** |
| **P1-08** | **Nguy cơ contract cần kiểm chứng:** [editor:187](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:187>), [viewer:167](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:167>), [requirements join:398](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/[id].tsx:398>), [enum:8](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/labels.js:8>) | Profile edit/viewer khác DTO; requirements string/array; gender Nam/male; weight keys commonSpace/hobbies so sharedSpace/interests | Nếu server không map, lưu không tác động matching, dữ liệu không hiện hoặc join sai kiểu. Chưa có bằng chứng server không chuyển đổi | Xác minh GET/PUT/matching mẫu; thống nhất DTO và enum/options, mapping nhỏ nếu API có hai representation | **Phải xác minh; sửa theo contract** |
| **P1-09 – conditional Web** | **Lỗi code path theo nền tảng:** [interceptor:13](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:13>), [Auth:16](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:16>) | Gọi SecureStore vô điều kiện trên Web; dependency web implementation không cung cấp native storage method | Guest/login/list request reject trước HTTP theo source dependency; chưa chạy browser. Không ảnh hưởng kết luận native cùng cách | Adapter theo platform và cơ chế auth web đã chọn; hoặc giới hạn deliverable native rõ ràng nếu đề không đòi Web | **Có nếu công bố/nộp Web**; không gọi P0 Android |
| **P2-01** | **Contract phân kỳ:** [subscription paths:78](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:78>), [billing:5](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/billing.js:5>), [FAQ:79](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:79>), [support service:3](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/support.js:3>), [room create:218](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:218>) | Screen dùng subscriptions/faqs khác wrapper billing/support; room create address string, detail object; mine list dùng pagination hook nhưng API không nhận page | Chưa chứng minh endpoint404 hoặc schema sai server; có thể fallback che lỗi và list không có shape đúng | Đối chiếu backend/OpenAPI hoặc mẫu response được phép; chọn một wrapper/DTO và adapter pagination đúng; không tự sửa path theo phỏng đoán | **Xác minh trước demo các flow liên quan** |
| **P2-02** | **Nguy cơ cache xuyên session:** [Pass cache:77](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:77>), [mine merge:105](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:105>), [messages:18](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/messages.tsx:18>), [favorites:12](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/favorites.tsx:12>) | State user-bound không reset/gắn user id đầy đủ; request lỗi để items cũ; Pass không theo dõi auth | A logout → B login có thể thấy cache/bài “của tôi”/conversation cũ trong UI, đặc biệt request mới lỗi; server quyền chưa biết | Clear cache/request generation theo session id; thêm user vào dependencies; recentCreated theo owner hoặc bỏ cache khi refetch ổn | **Nên sửa và thử nhiều tài khoản trước demo** |
| **P2-03** | **Nguy cơ overwrite dữ liệu:** [profile GET catch:177](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:177>), [save:187](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:187>) | GET lỗi chỉ console; default form vẫn có thể PUT toàn bộ fields | Nếu backend chấp nhận payload, người dùng có thể đè profile cũ bằng defaults sau load fail; chưa tái hiện mất dữ liệu | Error/retry state; chỉ cho save khi load thành công; không suy luận giá trị mặc định là dữ liệu thật | **Nên sửa trước demo hồ sơ** |
| **P2-04** | **Lỗi đồng bộ UI có điều kiện:** [Auth value:50](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:50>), [profile save:223](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:223>), [gói success:121](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:121>) | Context chỉ set lúc login/bootstrap; save/gói không refresh | Nếu server đã đổi dữ liệu, Account vẫn hiển thị avatar/tên/gói cũ tới login/restart | Thêm refreshSession/refreshProfile nhỏ vào Context hoặc cập nhật snapshot từ response đã xác minh | **Nên sửa** |
| **P2-05** | **Validation/error thiếu:** [create room:208](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:208>), [Pass số/ngày:422](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:422>), [Pass edit:532](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:532>), [profile numbers:192](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:192>) | Giá/cọc/budget dùng Number thiếu finite/range; min≤max/ngày lịch/tháng nguyên chưa đầy đủ; room lỗi chỉ console; thiếu title/address return silent | Payload âm/NaN/ngày không hợp lệ có thể gửi; server validator chưa biết; người dùng không hiểu lỗi tạo phòng | Validator nhỏ trước submit: trim/required, finite/nonnegative, min≤max, enum, ngày thật; hiển thị lỗi/success rõ | **Nên sửa các form được demo** |
| **P2-06** | **Thứ tự source xác minh:** [create upload:367](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:367>), [create validate:400](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:400>), [edit upload:488](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:488>), [edit validate:519](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:519>) | Upload trước kiểm tra address/lease; retry có thể upload lại ảnh | Form sai vẫn tốn upload; file mồ côi phụ thuộc server cleanup, chưa xác minh | Validate toàn bộ trước upload; giữ URL upload thành công cho retry hoặc cơ chế cleanup đơn giản theo server | Nên sửa; không phải P0 |
| **P2-07** | **Nguy cơ pagination race:** [hook:49](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:49>), [refresh:54](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:54>), [loadMore:61](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:61>) | loadMore không chặn refreshing; tăng reqId chung có thể vô hiệu hóa refresh; finally cũ tắt loading mới; dedup thiếu _id | Refresh page1 đang chờ rồi page2 chạy có thể giữ list cũ; IDs chỉ _id có thể mất item khi dedup. Cần response/kịch bản latency để tái hiện | Chặn loadMore lúc refresh/reset; generation guard cả finally; chuẩn hóa id theo contract | Nên kiểm chứng và sửa |
| **P2-08** | **Nguy cơ polling/cursor:** [chat merge:68](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:68>), [poll:93](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:93>), [send merge:121](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:121>), [badge response:20](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/NotificationContext.js:20>) | Poll 4/10s có thể chồng timeout60s; cleanup timer không bỏ response cũ; send response cũng tiến cursor fetch | Response out-of-order có thể lùi cursor/ghi badge cũ; tin đối phương chưa poll có timestamp trước tin vừa gửi có thể bị bỏ nếu backend since dùng timestamp độc quyền | Chặn poll overlap, session/focus guard; tách fetch cursor khỏi send merge, dùng cursor contract server hoặc overlap window+dedup | **Nên sửa/kiểm chứng chat đa thiết bị** |
| **P2-09** | **Lỗi error-state + nguy cơ stale response:** [room effect:61](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:61>), [Pass load:99](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:99>), [error branch:174](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:174>) | Không reset error ở start/success; Pass load thiếu cleanup/guard; data không reset đầy đủ theo identity | Một lần lỗi có thể chặn UI dù lần sau GET thành công; đổi id/user có thể bị response cũ ghi đè | Reset error/loading phù hợp; active/request guard theo id/session; thêm retry đơn giản | Nên sửa |
| **P2-10** | **Nguy cơ favorites race/error UX:** [favorites load:18](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/favorites.tsx:18>), [Pass toggle:115](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:115>), [room toggle:79](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:79>) | Đổi type có request cũ; nhiều optimistic mutation không serialize; catch rollback không báo | Có thể render item sai loại hoặc rollback đè ý định mới; lỗi bị che khi items còn | Request guard/type reset, busy cho mutation, thông báo lỗi ngoài EmptyComponent | Nên sửa/kiểm thử mạng chậm |
| **P2-11** | **Thiếu callback Android:** [Modal:597](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:597>) | EditPassModal thiếu onRequestClose | Hardware Back chưa được nối logic đóng modal; chưa kiểm chứng hành vi thực tế trên APK, không kết luận crash | `onRequestClose` gọi onClose theo RN API; thử Back/keyboard trên Android | **Nên sửa trước demo Android** |
| **P2-12** | **UI authorization gap; server chưa kiểm chứng:** [edit query:96](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:96>), [modal render:397](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:397>) | edit=true mở modal không phụ thuộc isOwner, dù nút owner có gate | Người không phải chủ có thể mở form; **không chứng minh sửa được dữ liệu người khác**, PUT có thể bị server chặn | Gate showEditModal && isOwner; xác minh server owner check cho PUT/PATCH/DELETE | **Nên sửa UI; quyền server phải kiểm chứng** |
| **P2-13** | **Lỗi filter source:** [recent filter:105](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:105>) | recentCreated lọc type nhưng không q | Bài vừa tạo vẫn hiện trong kết quả keyword không liên quan nếu chưa có id trong response server | Refetch và bỏ cache khi đã đồng bộ; hoặc áp cùng filter/session cho local items | Nên sửa nếu demo search sau create |
| **P2-14** | **Lỗi nhãn:** [moderation:254](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:254>), [create message:479](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:479>), [labels:33](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/labels.js:33>) | Pending/unknown được ghi Đang hiển thị; create luôn nói hiển thị ngay | Nhầm local card có mặt với bài đã approved/public; moderation server chưa xác minh | Dùng moderation label chung, dựa status thật và thông báo chờ duyệt nếu pending | Nên sửa |
| **P2-15** | **Fallback che lỗi/khả năng chưa có:** [plans fallback:80](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:80>), [FAQ fallback:77](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:77>), [FAQ report:63](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:63>) | Mọi lỗi/shape không đúng dùng static không chỉ báo; FAQ hứa report icon chưa có | Bản demo có vẻ online dù API fail; giá/quota có thể lệch server; người dùng tìm chức năng không tồn tại | Chỉ rõ fallback/offline, sửa mô tả theo mobile thực tế; thêm report chỉ nếu scope yêu cầu | Nên sửa thông tin; không bắt buộc thêm payment/report |
| **P2-16** | **Nguy cơ duplicate subscription:** [button disable:215](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:215>) | Chỉ khóa gói đang submitting, các gói khác còn bấm được; confirmation callback chưa guard chung | Có thể gửi nhiều yêu cầu nâng/gia hạn đồng thời; tác động quota/phí phụ thuộc server | Khóa toàn form/guard handler khi mutation đang chạy; idempotency theo contract nếu cần | Nên sửa cùng P1-06 |
| **P2-17** | **Auth/shape runtime risk:** [bootstrap catch:22](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:22>), [chat user.id:162](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/chat/[id].tsx:162>), [profile editor effect:126](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:126>), [Pass create:177](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:177>) | Không có auth retry/401 response flow chung; direct route chat/editor và Pass mine/create thiếu guard session; nhiều nested fields dùng trực tiếp | Guest có thể mở form và chỉ biết lỗi sau gọi API; token hết hạn vẫn có UI user; offline bootstrap thành guest; user null + message data tới có thể crash render. Tái hiện phụ thuộc state/API; không khẳng định crash hiện tại | Guard loading/user ở private screen, re-login/retry khi401, validate response tối thiểu; không cần refresh-token system lớn | **Nên sửa/kiểm chứng trước demo cold start/logout/deep link** |
| **P2-18** | **Nguy cơ hiệu năng/layout:** [card ratio:24](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:24>), [Gallery:198](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:198>) | Chiều cao ảnh theo ratio gốc không clamp; ảnh kích thước gốc, getSize callback không guard | Ảnh rất cao làm card/gallery dài, layout nhảy; nhiều ảnh lớn tốn tài nguyên. Chưa đo FPS/memory, không khẳng định OOM | Clamp tỷ lệ/chiều cao, thumbnail kích thước phù hợp, guard callback theo URI | Cải thiện; ưu tiên khi dữ liệu demo có ảnh lớn |
| **P3-01** | **Code thừa/đặt sai tên:** [collapsible:42](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui/collapsible.tsx:42>), [starter tabs:23](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.tsx:23>), [ThemeContext](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/ThemeContext.tsx:42>) | Unused starter, duplicate Pass detail, hai hệ theme; 31 API wrappers chưa dùng; UserCard không caller | Nhiễu bảo vệ, kéo thêm checks/types/deps; không chứng minh runtime crash vì unreachable | Xác nhận import graph rồi bỏ/ghi ngoài scope; giữ UI đang dùng; không xóa peer dependencies tùy tiện | Không bắt buộc riêng; phần gây lint/tsc phải xử lý P1 |
| **P3-02** | **Bảo trì/typing:** [Pass form:293](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:293>), [edit form:480](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:480>), [tsconfig:14](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/tsconfig.json:14>) | Screen lớn, create/edit validation trùng, palette lặp; JS API/Context any không có checkJs/DTO rõ | Dễ lệch form/contract; strict TS chưa bảo vệ toàn bộ API | Tách form liên quan, helper validation chung, vài types/JSDoc; không chuyển toàn repo/enterprise pattern | Không; sửa cùng chức năng khi có lợi |
| **P3-03** | **UX/nội dung demo:** [profile hint:163](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/connections.tsx:163>), [login hint:94](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/login.tsx:94>), [support contact:145](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/support.tsx:145>), [StatusBar:10](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:10>) | Hướng dẫn sửa profile trên web dù có editor; đăng ký web không link; hotline placeholder; statusbar dark trên UI tối | Luồng hướng dẫn thiếu mạch lạc; thông tin contact chưa hoàn chỉnh; system bar cần thử thực tế | Link đúng editor/site được xác minh, bỏ placeholder hoặc ghi demo, chỉnh contrast sau kiểm tra thiết bị | Nên dọn trước trình bày, không blocker kỹ thuật riêng |
| **P3-04** | **Edge UI/data consistency:** [Pass key:203](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx:203>), [Gallery index:187](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:187>), [preview:794](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx:794>), [login submit:35](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/login.tsx:35>) | Random fallback key, Gallery index không clamp khi ảnh đổi, edit preview không normalize relative URL; login/picker async guards chưa đầy đủ | Có thể remount item/counter sai/preview hỏng nếu data phù hợp; keyboard login có thể gửi trùng; picker rejection chưa hiển thị lỗi | ID ổn định, reset/clamp index, imageUrl chung, busy handler/catch picker; bắt lỗi dialer | Không; kiểm thử nếu dùng kịch bản tương ứng |
| **P3-05** | **Tài liệu/config cleanup:** [README](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/README.md:1>), [reset script:59](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/scripts/reset-project.js:59>), [ImagePicker plugin](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json:39>) | README còn mẫu Expo và hướng dẫn reset; script thực sự move/xóa src/scripts; permission microphone phát sinh dù chỉ ảnh; chưa có test script | Người mới có thể reset nhầm source; hướng dẫn setup/demo thiếu; permission dư. Không chạy reset trong audit | Viết README Roomie, bỏ hướng dẫn/script reset khỏi workflow nộp, ghi Node/API/account demo riêng không lộ mật khẩu; cân nhắc bỏ microphone permission qua plugin config | **Nên hoàn thiện tài liệu trước bàn giao**; test framework không tự bắt buộc |

Tổng: **32 mục**, gồm 9 P1 (1 conditional Web), 18 P2 và 5 P3; P0 chưa có finding. Các ID trong bảng là đơn vị theo dõi; một số mục gom nhiều biểu hiện cùng nguyên nhân để tránh đếm trùng. Mọi yêu cầu “thiếu bắt buộc theo môn” vẫn chưa thể xác định khi không có rubric.

### 3. Chi tiết kết quả typecheck và lint

Typecheck thực chạy:

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false
exit code: 1
```

| Nhóm | File:dòng | Diagnostics |
|---|---|---|
| Tabs API | [tabs layout:26](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx:26>) | 1 × TS2322: initialRouteName không thuộc props type của Tabs bản đang cài |
| Scheme types | [native tabs:8](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.tsx:8>), [web tabs:52](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.web.tsx:52>), [use-theme:11](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-theme.ts:11>) | 3 × TS2367 so sánh unspecified không thuộc union; 3 × TS2538 index bằng null |
| Web starter route/ref | [web:27](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.web.tsx:27>), [web:38](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/app-tabs.web.tsx:38>) | 2 × TS2322: `/explore` không thuộc typed routes; Pressable ref không khớp |
| Active shared KeyboardScreen | [ui:59](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:59>), [ui:62](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:62>) | 1 × TS2322 ref; 1 × TS2339 measureInWindow; 2 × TS7006 callback `_x`,`y` implicit any |
| Tổng | — | **13 diagnostics** |

Không có diagnostic missing relative module ở ui/collapsible; không được đưa nhận định đó vào backlog.

Lint thực chạy với `CI=1`, `EXPO_NO_TELEMETRY=1`:

```text
node node_modules/expo/bin/cli lint --no-cache
exit code: 1
20 problems (16 errors, 4 warnings)
```

| Rule / loại | Vị trí | Số lượng, diễn giải |
|---|---|---|
| react/no-unescaped-entities | [profile edit:577](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/profile/edit.tsx:577>) | 2 errors cho apostrophe JSX |
| import/no-unresolved | app-tabs native/web, hint-row, themed-text/view, web-badge, constants/theme, use-theme | 11 errors liên quan alias `@/`; file đích có thật, tsconfig có mapping. Chưa xác định nguyên nhân resolver sâu hơn, không kết luận Metro không resolve |
| react-hooks/set-state-in-effect | [Notification:26](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/context/NotificationContext.js:26>), [scheme web:11](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-color-scheme.web.ts:11>), [pagination:49](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:49>) | 3 errors theo rules bản cài; không tự quy thành memory leak/infinite render |
| import/no-named-as-default-member | [axios:6](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:6>) | 1 warning về `axios.create`; không chứng minh Axios bị gọi sai |
| exhaustive-deps / no-unused-vars | [subscription:88](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:88>), [subscription:125](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:125>) | 2 warnings: DEFAULT_PLANS dependency; error chưa dùng |
| unicode-bom | [ui:1](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:1>) | 1 warning BOM; không phải lỗi logic |

Chưa phát hiện syntax parse error qua lint/typecheck, nhưng các lệnh này không thay runtime integration test và không kiểm tra đầy đủ JS business contracts.

## VIII. Recommended Improvements

### 1. Giữ, sửa, đơn giản hóa, bổ sung và loại bỏ

| Hướng xử lý | Thành phần | Đề xuất trực tiếp, giới hạn phạm vi |
|---|---|---|
| **Giữ nguyên** | Expo SDK58, RN, Router trong src/app, Stack/Tabs | Không đổi stack hoặc hạ phiên bản để “dễ hơn” khi chưa có yêu cầu môn học; sửa API/types theo bản cài |
| **Giữ nguyên** | Context Auth/Notification, local state, API layer theo domain | Có thể giải thích được; không thêm Redux/Zustand/repository/DI chỉ để trông chuyên nghiệp |
| **Giữ nguyên** | FlatList, loading/error/empty, cards, Gallery, KeyboardScreen, safe area | Sửa từng lỗi cụ thể; không viết lại UI toàn app |
| **Sửa ngay** | P1-03 token/URL ảnh; P1-04 upload hồ sơ; P1-05 accept handler; P1-06 false acknowledgement | Đây là lỗi/thiếu bước thấy rõ, không cần đợi rubric mới nhận diện được |
| **Sửa ngay** | P1-01/02 typecheck/lint | Ưu tiên shared UI đang dùng; dọn starter thật sự thừa để giảm lỗi, sửa config resolver; không che errors bằng broad ignores |
| **Xác minh rồi sửa** | P1-07/08 và P2-01: User/Profile/Plan/FAQ/Accommodation DTO | Lấy contract/mẫu response đã được phép; xác nhận fields, enums, id, pagination và paths. Không đoán backend từ tên wrapper |
| **Đơn giản hóa** | checkIsVip nhiều field/substrings | Một field/enum hoặc entitlement đã được backend xác nhận; một helper quyền dễ hiểu |
| **Đơn giản hóa** | recentCreated và logic merge ở Pass | Ưu tiên refetch sau create; nếu cần optimistic preview thì gắn user/filter/status và bỏ khi server đồng bộ |
| **Đơn giản hóa** | Hai theme systems, repeated palettes/forms | Chọn palette thực tế đang dùng; tách form Pass khi sửa; helper validation nhỏ; không tái cấu trúc toàn bộ |
| **Bổ sung** | Error/retry profile load; refreshSession; auth guards; session/request generation | Thêm vào modules sẵn có, tránh tạo nhiều lớp trung gian |
| **Bổ sung** | Vài types/JSDoc cho User, Profile DTO, Listing, Message, Paginated | Giúp phát hiện mismatch; không cần bắt buộc chuyển tất cả JS sang TS |
| **Bổ sung** | Validation và thông báo thao tác | Kiểm số/ngày/enum trước upload; tách success khỏi fallback/error; không cần form library mới |
| **Bổ sung** | README Roomie và kịch bản demo | Nêu setup Node/npm, backend dependency, platform hỗ trợ, feature thật, known limits và cách chạy; không ghi mật khẩu/token vào repo |
| **Loại bỏ sau xác nhận** | Duplicate collapsible, starter tabs/theme/badge/animation không dùng, assets thừa | Chỉ xóa khi người dùng yêu cầu chỉnh sửa và import graph xác nhận; audit này chưa xóa |
| **Loại bỏ/ghi ngoài scope** | API wrappers admin/payment/report/block/register ngoài phạm vi mobile | Không cần hoàn thành tất cả chỉ vì đã có wrapper; không trình bày là feature đã chạy |
| **Có thể giữ nâng cao** | Matching weights/privacy, chat/polling, upload ảnh, SecureStore, TypeScript | Giữ khi phục vụ sản phẩm và nhóm giải thích được data flow/giới hạn. Chưa có bằng chứng cần bỏ vì “vượt môn” |
| **Theo deliverable** | Web, EAS development client, offline DB, push, payment gateway | Chỉ làm nếu đề hoặc phạm vi nhóm cần. Native Android không nên bị trì hoãn bởi các tính năng ngoài mục tiêu |

### 2. Thứ tự thực hiện đề xuất

**Bước 1 — chốt hợp đồng và sửa P1 thấy rõ.** Giữ stack/phiên bản hiện tại, xác định Android có phải deliverable chính, thu thập rubric và API contract. Song song sửa URL/token ảnh, upload profile, accept handler và thông báo subscription. Với VIP/profile/path chưa xác minh, kiểm chứng payload/response trước khi đổi model.

**Bước 2 — đưa kiểm tra tĩnh về trạng thái đạt.** Sửa ref/Tabs/scheme types, JSX, resolver và effect rules có căn cứ; dọn code starter không dùng. Chạy lại lint và typecheck sau thay đổi code. Không nâng/hạ toàn SDK nếu không có lý do tương thích cụ thể.

**Bước 3 — ổn định các flow sẽ demo.** Chặn save sau profile load fail, refresh Auth Context, clear cache theo user, validation trước upload, guard private screens, khóa mutation, reset errors và chặn poll/refresh overlap. Kiểm chứng cursor chat và moderation với server.

**Bước 4 — build và thử Android thật.** Dùng preview APK profile sẵn có; xác minh app identity/EAS association và credentials hợp lệ trong quá trình build được người dùng cho phép. Cài APK trên thiết bị, thử cold start, lifecycle, Back, keyboard và lỗi mạng. Build thành công vẫn cần test integration.

**Bước 5 — dọn P3 và chuẩn bị bảo vệ.** README/placeholder/starter cleanup, sơ đồ data flow đủ đơn giản, phạm vi feature thật, minh chứng persistence và known limitations. Chỉ mở rộng feature theo rubric sau khi phần hiện có ổn định.

Những lệnh sau là **đề xuất cho giai đoạn sửa/build sau này**, chưa thực hiện trong audit:

```text
npx expo lint --no-cache
npx tsc --noEmit
npx eas-cli@latest build --platform android --profile preview
```

Repository dùng npm. Khi cần cài module ở giai đoạn sau, dùng `npx expo install <package>` theo AGENTS; không tự thêm dependencies trong audit. Cấu hình preview APK hiện tại phù hợp cách build được mô tả trong [tài liệu EAS APK](https://docs.expo.dev/build-reference/apk/). Không chạy build/deploy chỉ để tạo bằng chứng khi người dùng mới cho phép audit.

### 3. Kiểm thử có giá trị cho bản nộp

Các ca sau **chưa chạy**; đây là kế hoạch kiểm chứng sau khi được phép sửa/chạy app với tài khoản/dữ liệu thử. Không cần xây test framework lớn để thay thế những kiểm chứng mobile này.

| Kịch bản | Kết quả cần chứng minh |
|---|---|
| Cold start không token, token hợp lệ, token401, mất mạng | Guest/private UX rõ; token hợp lệ khôi phục user; lỗi mạng có retry; không nhầm logout với mất mạng |
| Login sai/đúng, submit liên tiếp, logout rồi login B | Error đúng, không request trùng ngoài ý muốn; không hiển thị cache/tin nhắn/bài “của tôi” của A |
| Sửa hồ sơ text/enum/budget; GET load fail rồi thử Save | Model round-trip đúng; min/max hợp lệ; load fail không ghi đè defaults; Account cập nhật ngay |
| Chọn avatar/ảnh phòng, xem từ thiết bị hoặc tài khoản khác, mở lại app | URL ảnh là URL server; ảnh không phụ thuộc file cục bộ hoặc cache máy chọn |
| Basic/Plus/Pro ở Account và tạo/mine phòng | User DTO/entitlement thống nhất; UI phù hợp quyền; server từ chối thao tác không được phép |
| Tạo phòng và mở detail sau restart | Address/contact/giá hiển thị đúng theo server; persistence được chứng minh, lỗi form có feedback |
| Pass room/item CRUD, xóa ảnh, ngày/giá sai, upload fail/retry | Validation trước upload; không báo public khi pending; sửa/xóa/status reload đúng; dữ liệu còn sau mở lại |
| Account không phải owner mở edit=true | Không mở form quản lý; server chặn PUT/PATCH/DELETE trái quyền; không chỉ dựa UI |
| A gửi kết nối B; B accept ở Profile và Connections; reject/cancel/disconnect | Cả hai điểm accept gọi đúng nghiệp vụ và state/badge/refetch nhất quán |
| Chat hai máy gửi cùng lúc, poll chậm, background/foreground | Không bỏ tin/cursor nhảy; không poll chồng; ảnh đúng HTTPS origin; không gửi token tới host ngoài |
| Favorites toggle nhanh, đổi type khi mạng chậm, đổi user | UI và server nhất quán; response cũ không ghi đè type/session mới; error không bị che |
| Plans/FAQ đúng response và simulated API failure | Phân biệt static fallback; subscription lỗi không báo thành công; success refresh currentPlan; không tạo giao dịch thật ngoài phạm vi |
| Photo picker cancel/denied/native error, dialer không hỗ trợ | Không unhandled rejection, thông báo rõ, người dùng có đường quay lại |
| Android modal Back, bàn phím, màn hình nhỏ, system bars | Đóng modal đúng callback, input/button không bị che, contrast/safe area phù hợp |
| APK release cold start bằng dữ liệu di động/Wi-Fi | Backend URL không phụ thuộc dev server/LAN; upload/ảnh/chat hoạt động thực tế ngoài Expo dev session |

Theo [RN Modal documentation](https://reactnative.dev/docs/modal#onrequestclose), onRequestClose là callback xử lý Back trên Android; việc chỉ có nút đóng trong modal không thay thế kịch bản Back này.

### 4. Nội dung cần hiểu để bảo vệ trước giảng viên

Nhóm nên giải thích được: screen nào sở hữu state; props đi vào card/Gallery ra sao; Context khác local state ở đâu; effect/focus cleanup dùng để làm gì; userId khác connectionId/conversationId; token được lưu ở đâu; FormData khác gửi URI trong JSON; backend/database phần nào nằm ngoài repository; matching score đến từ server; optimistic UI và polling có giới hạn gì.

Nếu dùng API/backend sẵn có hoặc thuộc repository khác, cần trình bày đúng nguồn và trách nhiệm của nhóm theo rubric. Không tuyên bố tự xây DB/matching/payment/admin chỉ dựa wrapper client. Nếu matching weights/privacy được giữ, cần chứng minh server nhận đúng keys và effect thực tế của từng tiêu chí; nếu chưa chứng minh được thì ghi giới hạn thay vì phóng đại.

## IX. Final Assessment

| Tiêu chí | Kết quả | Nhận xét |
|---|---|---|
| Công nghệ phù hợp MMA301 | **Hợp lý về kỹ thuật; chưa xác nhận học phần cụ thể** | Expo/RN/React/Router/Context/REST phục vụ mobile rõ ràng; thiếu rubric/syllabus để kết luận compliance |
| Kiến trúc project | **Đủ đơn giản, nên giữ** | Component-based + API layer mỏng; không cần nâng thành enterprise; lỗi chính nằm ở contract/state/handler |
| Cấu trúc thư mục | **Khá rõ, còn starter và screen lớn** | Routes đúng src/app; API/components/hooks tách hợp lý; dọn 19 module không reachable theo nhu cầu và tách form từng phần |
| Chất lượng frontend | **Có nền tảng tốt, chưa ổn định đủ** | Reuse/list/keyboard/loading hiện hữu; accept/subscription/profile ảnh/auth guards còn vấn đề |
| Backend/API (nếu có) | **Client API có; backend ngoài workspace, chưa kiểm chứng** | Không kết luận framework/DB/auth/CORS/server validation; vài path/DTO phân kỳ cần xác minh |
| Database và data models | **Model frontend đủ dùng nhưng thiếu nhất quán** | Token persistence native có; business persistence do API, chưa có test round-trip; không thấy DB local |
| Chức năng và user flows | **Phạm vi khá rộng, nhiều flow thật, một số chỉ một phần** | Pass CRUD/chat/connections/favorites có handlers; report/admin/register/payment provider chưa là mobile feature |
| Code quality | **Chưa đạt kiểm tra hiện tại** | Lint16errors/4warnings; tsc13diagnostics; có any/validation/race và code thừa; không phải mọi warning đều là runtime bug |
| Android build readiness | **Có cấu hình sơ bộ; chưa đủ bằng chứng** | Có package/plugins/EAS APK profile; chưa build/install APK; cần kiểm chứng native UI/network/release |
| Mức độ hoàn chỉnh project | **Chưa nên chốt nộp/demo** | Cần sửa P1 chính, kiểm chứng contract/session/data và APK; không đánh giá điểm hay phần trăm hoàn thành khi thiếu rubric |

### 1. Project phù hợp MMA301 đến mức nào, dựa trên căn cứ nào?

Project thể hiện thực hành mobile/React Native thực tế: components, props, local/global state, hooks, routing, async REST, form, list, local token persistence và chọn ảnh. Đây là căn cứ kỹ thuật để đánh giá hướng đi **phù hợp một project sinh viên về mobile**. Tuy nhiên, **chưa có căn cứ xác nhận mức tuân thủ MMA301 của lớp này**, vì không có đề/rubric/tài liệu môn học. Không thể chấm compliance bằng phần trăm hoặc xác nhận đạt mọi mục bắt buộc.

### 2. Có dùng công nghệ nâng cao quá mức cần thiết không?

Không thấy overengineering kiến trúc tổng thể. TypeScript, Expo Router, custom hooks, Context, SecureStore, upload ảnh và chat/polling có mục đích rõ. Matching weights/privacy là phần nghiệp vụ nâng cao nhưng có thể giữ nếu nhóm hiểu và backend hỗ trợ. Phần dư đáng dọn là starter không chạy, wrappers chưa nối và check VIP đoán nhiều field; không cần bỏ toàn bộ stack nâng cao để “đúng môn”.

### 3. Những phần quan trọng nhất cần sửa là gì?

Sửa host/token ảnh chat, upload ảnh hồ sơ, accept handler và false acknowledgement subscription; đưa lint/typecheck về đạt; xác minh User/Profile/Plan/FAQ/Accommodation contracts. Sau đó xử lý profile load error, session cache, Context refresh, validation, polling/cursor và Android Back/keyboard.

### 4. Những thành phần nào nên giữ nguyên?

Giữ Expo/RN/Router hiện tại, routes trong src/app, API layer chia domain, Context + local state, reusable cards/UI, FlatList, SecureStore native và upload service. Chỉ sửa/tách phần có vấn đề; không cần viết lại app, thêm backend/database mới hay áp Clean Architecture nếu đề không yêu cầu.

### 5. Có đủ cơ sở xác nhận sẵn sàng nộp và demo chưa?

**Chưa.** Có bằng chứng source đủ để nhận diện các lỗi cần giải quyết; chưa có rubric để xác nhận yêu cầu, backend contract/runtime để xác nhận integration, hoặc APK build/install để xác nhận Android. Kết luận này không đồng nghĩa “app chắc chắn không chạy”; nó phản ánh đúng giới hạn kiểm chứng và các lỗi đang tồn tại.

### 6. Thứ tự tối ưu từ P0 đến P3

1. **P0:** chưa có finding xác nhận; khi chạy/build sau này nếu phát hiện blocker thực tế thì xử lý trước và tiếp tục kiểm tra phần còn lại.
2. **P1:** ưu tiên P1-03/04/05/06 và kiểm tra tĩnh P1-01/02; xác minh P1-07/08; xử lý P1-09 nếu Web nằm trong deliverable. Các việc này có thể chia nhóm song song nhưng tránh đổi contract theo suy đoán.
3. **P2:** ưu tiên contract và data safety/session (01–04,17), validation/upload (05–06), chat/pagination/async (07–10), Android modal/owner guard (11–12), rồi filter/status/fallback/duplicate mutation/performance (13–16,18).
4. **P3:** dọn code/tài liệu/UX/ảnh/key/types từng phần sau khi luồng chính ổn; giữ thay đổi nhỏ và kiểm tra lại lint/typecheck sau sửa.

### 7. Phần đã kiểm tra và phần còn ngoài phạm vi xác minh

**Đã kiểm tra:** toàn bộ 55 file trong src (53 JS/TS/TSX + 2 CSS), script reset, README/AGENTS/LICENSE, manifest/lockfile, app/EAS/TS/ESLint/gitignore/VSCode config, asset inventory và asset config, dependency versions/import usage, routes/handlers/API declarations, các CLI không sửa code được nêu ở mục I. Các PNG/SVG assets được kiểm kê/tham chiếu cấu hình; không thực hiện QA thiết kế từng ảnh hoặc chụp UI app.

**Chưa kiểm chứng:** backend source/deployment/logs, OpenAPI/schema/DB server và dữ liệu thực, tài khoản/quota/moderation/privacy/payment enforcement, secrets trong lịch sử git/server, build EAS/signing/APK runtime, CORS/browser và iOS runtime, hiệu năng/memory thực, accessibility kiểm thử trên thiết bị, rubric/tài liệu học phần. Dependencies/cache/build artifacts không được đọc toàn bộ theo đúng phạm vi audit.

Không có file source trong workspace bị bỏ qua vì lỗi truy cập. Các phần chưa kiểm chứng chủ yếu là tài liệu không có và hệ thống/runtime ngoài workspace; không được xem là đã pass.

### 8. Nguồn kỹ thuật chính thức đã dùng

- [Expo SDK58 reference](https://docs.expo.dev/versions/v58.0.0/) — đối chiếu thế hệ React/RN/Node, không dùng trí nhớ SDK cũ.
- [Expo llms.txt](https://docs.expo.dev/llms.txt) — chỉ mục/corrections và đường dẫn tài liệu cần đối chiếu.
- [Expo Router JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/) và [authentication](https://docs.expo.dev/router/advanced/authentication/) — tham khảo routing/lifecycle/auth pattern; diagnostics thực tế vẫn theo package cài trong workspace.
- [SecureStore SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/) — nền tảng và lưu credential native.
- [ImagePicker SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/) — chọn ảnh/permission/config plugin.
- [EAS APK build reference](https://docs.expo.dev/build-reference/apk/) — ý nghĩa preview APK profile.
- [React Native Modal](https://reactnative.dev/docs/modal#onrequestclose) — Android Back/onRequestClose.

Các nguồn trên là tài liệu công nghệ, **không phải tài liệu xác nhận syllabus MMA301**. Mọi đề xuất sửa trong báo cáo vẫn là đề xuất; audit không chỉnh sửa source, cài package hoặc thay đổi dữ liệu nghiệp vụ.
