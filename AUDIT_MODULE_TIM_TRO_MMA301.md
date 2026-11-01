# Audit Module Tìm trọ — ROOMIE / MMA301

Ngày: **30/10/2026**, Asia/Saigon. Workspace: `C:\Ki 7 SE (FALL)\MMA301\Roomie-Mobile`.

**Ghi chú phiên bản:** Mục I–X giữ kết quả audit ban đầu, trước khi sửa code. Các phần **Cập nhật triển khai** cuối file ghi nhận thay đổi sau audit. Phân quyền từng được tạm hoãn, sau đó đã được người dùng cho phép sửa ở frontend; xem bản cập nhật cuối cùng bên dưới. Không dùng kết luận hiện trạng cũ ở I–X để thay thế kết quả triển khai mới.

## I. Executive Summary

**Module đã có khung mobile thực tế: danh sách, tìm kiếm qua API, chi tiết có gallery, Tin của tôi và form Đăng tin có POST. Tuy nhiên, chưa đủ bằng chứng xác nhận sáu đầu việc đã hoàn thành hoặc module sẵn sàng demo end-to-end.**

Kết luận quan trọng nhất theo phạm vi Tiến Dũng:

1. **Tìm theo khu vực + nút X:** đã có ô tìm kiếm gửi `q`; **chưa có nút Xóa tìm kiếm**. Chưa biết backend có tìm theo địa chỉ/khu vực hay chỉ tiêu đề. Xóa chữ thủ công chưa reset query đang áp dụng nếu chưa submit lại.
2. **Đăng được bài:** có form, handler POST, loading và chuyển sang Tin của tôi sau response thành công. Chưa kiểm chứng quyền tạo, contract địa chỉ/liên hệ, server validation và persistence database; API fail chỉ console, không báo người dùng.
3. **Ảnh:** list đã tính chiều cao theo tỷ lệ ảnh bìa; detail có gallery vuốt ngang và đếm ảnh. Đây là implementation thật, nhưng ảnh không đồng đều chiều cao, chưa giới hạn ảnh quá cao, chưa có loading/error placeholder ảnh. List chỉ hiển thị một ảnh bìa.
4. **Phân quyền mine/create:** có điều kiện UI nhưng **predicate bỏ qua `currentPlan` và `isLandlord`**, dùng substring trên các field khác. Chạy thử hàm thuần tách từ source đã chứng minh một số input đúng mô hình dự kiến bị chặn/mở UI sai. Chưa chứng minh server cho vượt quyền.
5. **Tin của tôi:** có giao diện segment + list + loading/refresh/empty/error + mở detail; **không phải chưa có UI**. Chưa có presentation trạng thái riêng và owner actions; các action mở rộng chỉ bắt buộc nếu scope nhóm xác nhận.
6. **Giao diện Đăng tin:** có 5 trường và nút submit hoạt động ở mức source; chưa có ảnh/diện tích/loại phòng/tiện nghi/field-error. Mức bắt buộc của các field phải theo schema/đề, không tự suy ra từ form của module Pass.

### Căn cứ và giới hạn

- **Nguồn phạm vi đã xác nhận:** đúng 6 đầu việc được người dùng cung cấp trong yêu cầu audit này. Không có rubric/syllabus hoặc schema backend trong workspace để mở rộng chúng thành yêu cầu bắt buộc.
- Các nhóm nghiệp vụ bổ sung trong prompt được audit đầy đủ, nhưng điều kiện “nếu thuộc yêu cầu project/được xác nhận” được giữ nguyên. Không tự coi filter nâng cao, sort, quota, 8 ảnh, lượt xem, duyệt lại hay owner CRUD là phần bắt buộc của 6 đầu việc.
- App khai báo API host ngoài workspace trong [axios:4](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:4>), base `/api`. **URL API không phải source backend.** Chưa có controller/model/database/middleware server để đối chiếu.
- Thử truy cập read-only GET public list/meta bằng công cụ web không đọc được response trong môi trường audit. Đây là hạn chế truy cập của công cụ, **không có HTTP response đủ để kết luận server down, 404 hoặc lỗi database**. Không thực hiện POST đăng tin, đăng nhập, GET detail có thể tăng view, hoặc mutation nào.
- Chưa chạy emulator, app UI, APK hoặc truy cập database. Không xác nhận hình ảnh mượt, quyền API an toàn, dữ liệu tồn tại sau restart hay APK chạy được.

### Kiểm tra thực hiện trong lần audit module

| Kiểm tra | Kết quả | Ý nghĩa |
|---|---|---|
| Đọc source accommodation và dependency liên quan | Đã đọc list/create/mine/detail, cards/gallery/hooks, auth/API/roles/navigation/config; tìm toàn source các caller | Không chỉ dựa README hoặc báo cáo cũ |
| Thử hàm `checkIsVip` từ source | 5 input giả lập, chạy bằng TypeScript transpile trong bộ nhớ và Node VM | Chứng minh kết quả predicate với các input đó; không phải tài khoản/server runtime |
| Expo lint `--no-cache` | Exit 1: **16 errors, 4 warnings** toàn project | Lỗi trực tiếp liên quan hook pagination và hạ tầng khác được phân biệt tại mục VIII |
| TypeScript `--noEmit --incremental false` | Exit 1: **13 diagnostics** toàn project | Không tự gán toàn bộ là lỗi riêng Tìm trọ; không chứng minh APK chắc chắn fail |
| API public GET list/meta | Công cụ web không truy cập được response | Backend/search/response schema vẫn chưa xác minh |
| Source/backend discovery | Không có backend trong workspace; chưa xác minh được repo backend từ remote công khai | Không tự đặt tên controller/schema/database |

**Không có P0 được chứng minh.** Các P1 trực tiếp là thiếu nút X theo công việc được giao, gate UI sai/thiếu căn cứ quyền, và rủi ro contract chặn nghiệm thu luồng đăng tin. Không đánh đồng thiếu source backend trong workspace với backend của sản phẩm không tồn tại.

## II. Source Code Inventory

### 1. Cây source liên quan

```text
src/
├── app/
│   ├── _layout.tsx                         # Stack, providers, route detail
│   ├── index.tsx                           # redirect tabs
│   ├── login.tsx                           # auth entry
│   ├── (tabs)/
│   │   ├── _layout.tsx                     # tab Tìm phòng
│   │   ├── index.tsx                       # search + mine + create cùng một screen
│   │   └── account.tsx                     # currentPlan/isLandlord và đường nâng gói
│   ├── accommodation/[id].tsx              # detail, favorite, phone/chat
│   ├── favorites.tsx                       # list tin phòng đã lưu
│   └── account/subscription.tsx             # dependency quyền/gói, không phải create phòng
├── components/{cards.tsx,ui.tsx,MessageOwnerButton.tsx}
├── hooks/use-infinite-list.ts
├── auth/AuthContext.js
├── context/NotificationContext.js           # provider được mount toàn app
├── api/
│   ├── accommodations.js                   # 8 wrappers, 4 có caller
│   ├── axios.js                            # host, token, imageUrl
│   ├── auth.js
│   ├── favorites.js
│   ├── conversations.js
│   ├── uploads.js                          # chưa nối form phòng
│   ├── billing.js                          # chưa nối module phòng
│   └── admin.js                            # chưa có UI moderation
└── utils/labels.js                          # room/status/moderation labels
```

Không nhầm [Pass tab](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/pass.tsx>) hay [Pass detail](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/pass/[id].tsx>) với Module Tìm trọ. Pass có upload/owner actions riêng nhưng **không làm các chức năng đó tự xuất hiện trong accommodation**. Các file Pass chỉ được đối chiếu khi xác định upload dùng chung và nguồn giới hạn ảnh.

### 2. File và trách nhiệm

| Nhóm | File/bằng chứng | Nội dung đã kiểm tra |
|---|---|---|
| Screen chính | [tabs/index:36](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:36>) | State text/q/tab, VIP predicate, fetcher, list và form, toàn bộ JSX/styles |
| Detail | [accommodation detail:51](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:51>) | GET detail, loading/error, địa chỉ/giá/status, Gallery, favorite, contact, chat |
| Card/list image | [cards:17](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:17>) | Image.getSize, ratio, cover, item ID, fields card và router params |
| Gallery/shared UI | [ui:177](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:177>) | Gallery, counter, no-image fallback, Segments, Loading, shared styles, keyboard/safe-area helpers |
| List state/lifecycle | [pagination:6](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:6>) | Response `{items,page,pages}`, refresh/loadMore, reqId, dedup, tab scroll listener |
| Accommodation API | [service:5](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:5>) | Toàn bộ 8 wrappers và caller toàn source |
| Auth/network | [Auth:7](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js:7>), [axios:4](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:4>), [auth API](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/auth.js:3>) | Token, user/profile shape, bootstrap/login/logout, Bearer interceptor, image URL |
| Vai trò/gói | [Account:39](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/account.tsx:39>), [Subscription:29](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:29>), [billing](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/billing.js:5>) | currentPlan, isLandlord, UI fallback quota, API phân kỳ, thiếu refresh session |
| Favorites | [favorites screen:18](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/favorites.tsx:18>), [API](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/favorites.js:5>) | GET theo type, card phòng, optimistic POST/DELETE từ detail |
| Liên hệ chat | [MessageOwnerButton:12](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/MessageOwnerButton.tsx:12>), [start API:24](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/conversations.js:24>) | UserId → conversationId → route chat; không phải tạo connection trước |
| Upload/admin | [uploads:3](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/uploads.js:3>), [admin:11](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/admin.js:11>) | Có wrapper nhưng chưa nối accommodation create/management/moderation |
| Enum | [labels:24](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/labels.js:24>) | Room types, listing status, moderation status, amenities, plans |
| Navigation | [root:20](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/_layout.tsx:20>), [tab:47](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx:47>), [entry:4](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/index.tsx:4>), [login:35](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/login.tsx:35>) | Stack/Tabs, route id, redirect, login flow; không có route riêng mine/create |
| Cấu hình | [manifest](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package.json>), [lockfile](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/package-lock.json>), [app](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/app.json>), [EAS](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eas.json>), [TS](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/tsconfig.json>), [ESLint](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eslint.config.js>) | SDK58, RN0.88.1, typed routes, plugins/photo picker, Android package/APK profile, checks |
| Tài liệu/phạm vi | [AGENTS](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/AGENTS.md>), [README](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/README.md>) | Quy tắc repo và README mẫu; không có tài liệu nghiệp vụ/module độc lập hoặc syllabus |
| Backend/model/DB | **Không có source tương ứng trong workspace** | Controller, middleware, validator, schema, migration, DB operations đều chưa thể đọc |

Công nghệ thực tế đủ gọn: React state/hooks/Context, Expo Router, Axios, RN Image/FlatList/ScrollView. Không có lý do thêm Redux, Clean Architecture, ORM hoặc carousel library chỉ để hoàn thiện sáu việc. [Expo SDK58](https://docs.expo.dev/versions/v58.0.0/) là tài liệu phiên bản đã đối chiếu; không nâng/hạ SDK trong audit.

## III. Tiến độ 6 đầu việc của Tiến Dũng

### A. Đánh giá riêng phạm vi được giao

**Không chấm % nghiệm thu bằng số tùy ý.** Một đầu việc có UI không đồng nghĩa đã tạo/lưu dữ liệu hoặc phân quyền đúng. Sáu đầu việc chưa có trọng số hoặc tiêu chí nghiệm thu chi tiết; API/backend/runtime chưa kiểm chứng. Cột phần trăm vì thế ghi rõ phần nào đếm được và phần nào chưa đủ căn cứ. Không chuyển số dòng code hoặc số wrapper thành tỷ lệ hoàn thành.

| STT | Đầu việc | Đã làm được | Còn thiếu/lỗi | % hoàn thành | Priority |
|---|---|---|---|---|---|
| 1 | Tìm kiếm theo khu vực và nút Xóa tìm kiếm | Có ô nhập, submit, q trong GET, tải trang1 khi q đổi | Không nút X; xóa text không reset q; chưa xác minh server q có tìm khu vực | **Chưa đủ căn cứ chốt %**. Có wiring 1/2 phần yêu cầu; semantics khu vực chưa xác nhận | **P1** cho X; P1/P2 cho contract/search UX |
| 2 | Đăng được bài cho thuê phòng | Form 5 trường → POST → loading/disable → chuyển mine | Gate sai; DTO chưa xác minh; validation/error feedback thiếu; chưa có test DB/persistence | **Chưa đủ căn cứ** xác nhận “đăng được”; hiện hoàn thành một phần theo source | **P1** về quyền/contract; P2 về form |
| 3 | Chỉnh kích thước ảnh list/detail; vuốt nhiều ảnh | Có cả 3 cơ chế: ratio cover, ratio detail, Gallery horizontal/paging/counter | Không clamp, ảnh lỗi/loading chưa xử lý, ratio khác nhau, chưa test Android; list chỉ cover | **Chưa chốt % nghiệm thu**. 3/3 cơ chế có source; gần hoàn thành cơ chế cơ bản, chưa hoàn tất chất lượng/runtime | **P2** |
| 4 | Phân quyền Tin của tôi và Đăng tin | Có gate ở cả hai nơi, banner khi false | currentPlan/isLandlord bị bỏ; substring; auth loading; chưa có bằng chứng API role/ownership/quota | **Có code nhưng logic chưa đúng/đủ**; không dùng “2/2 có gate” để gọi hoàn thành | **P1** |
| 5 | Tạo giao diện Tin của tôi | Segment, fetch mine, card/list, loading/refresh/empty/error, mở detail | Bị gate chặn nhầm; mine shape/paging và session cache chưa chắc; thiếu status presentation riêng | **UI cơ bản đã có**, gần hoàn thành phần khung; chưa có cơ sở chấm % sử dụng thực tế | **P1** dependency quyền; P2 UI/data |
| 6 | Tạo giao diện Đăng tin | Form/styling 5 trường, ScrollView, numeric keyboard, nút submit/loading | Thiếu lỗi/success rõ, keyboard/inset QA, fields theo DTO chưa xác nhận; chưa có image UI | **UI cơ bản đã có**, chưa đủ nghiệm thu form nghiệp vụ; không tự chấm % từ số field | **P2**, phụ thuộc P1 contract/quyền |

**Tổng hợp A:** 6/6 đầu việc có ít nhất một phần implementation. Không có đầu việc nào được gắn nhãn đã nghiệm thu đầy đủ bằng APK/server trong audit này. Đầu việc 1 thiếu một yêu cầu tường minh; đầu việc 4 có vấn đề logic rõ; đầu việc 2 chưa chứng minh end-to-end; 3/5/6 có khung UI/cơ chế đáng giữ.

### B. Mức hoàn thiện toàn module

Không gộp phạm vi này với tiến độ cá nhân. Module rộng hơn gồm filter/sort, full form/upload, owner CRUD/status và admin moderation theo checklist, nhưng **chưa được xác nhận tất cả là deliverable bắt buộc**.

| Lớp đánh giá | Hiện trạng |
|---|---|
| UI | Có search/list/detail/gallery/mine/basic-create; không có filters/sort/owner edit-delete-status/moderation UI |
| Logic | Có query, list hook, detail, favorite/contact, create handler; permission predicate sai và vài async/error gaps |
| API client | Accommodation 4/8 wrapper có caller: list/get/mine/create; 4 wrapper còn lại chưa nối. Đây là **coverage wrapper**, không phải % module |
| Database | Không có schema/source hoặc round-trip test; chưa xác minh được persistence |
| Authorization | Có UI gate, chưa đúng field/policy; server authority chưa xem được |
| Integration | Có đường gọi FE→API; chưa có kết quả HTTP authenticated/DB/APK để xác nhận thành công |
| Runtime verification | Chỉ thử hàm thuần và CLI checks; chưa chạy mobile end-to-end |

**Không đủ căn cứ đưa một % hoàn thiện toàn module đáng tin cậy.** Đưa 60/70/80% lúc này sẽ phải tự đặt trọng số cho chức năng ngoài scope và coi API chưa kiểm chứng là đã chạy. Sau khi có API contract, scope chốt và kết quả test ở mục IX, có thể chấm tỷ lệ theo từng acceptance criterion đã thống nhất.

## IV. Feature Audit Matrix

Quy ước: **Có** = tồn tại trong source; **Chưa nối** = wrapper có nhưng không caller/UI; **CX** = chưa xác minh backend/runtime. Priority có dấu `*` chỉ trở thành lỗi thiếu bắt buộc nếu nhóm/rubric xác nhận scope mở rộng đó.

| Nhóm chức năng | Tính năng | UI | Logic | API/DB | Trạng thái | Priority |
|---|---|---|---|---|---|---|
| 4.1 Tìm trọ | Danh sách, card, click detail | Có | Có | GET list dùng; DB CX | Hoàn thành một phần, runtime CX | P2 gaps |
| 4.1 | Chỉ approved + available công khai | Không filter FE riêng | Không kiểm tra FE | Server policy/CX | Chưa đủ bằng chứng; không khẳng định lọt tin | Xác minh, không tự P0 |
| 4.1 | Keyword/khu vực | Có placeholder tiêu đề/quận/phường | Gửi q khi submit | Search semantics CX | Một phần | P1/P2 |
| 4.1 | Nút Xóa (X), clear khôi phục list | **Không** | **Không** | Có thể dùng list q rỗng, chưa nối X | **Chưa triển khai yêu cầu được giao** | **P1** |
| 4.1 | Reset bộ lọc/sort/page | Không | Không có filter/sort state | Không params tương ứng từ screen | Chưa triển khai; ngoài scope6 mặc định | P2* |
| 4.1 | Giá, diện tích, loại phòng, amenities, đa điều kiện | Không | Không | Wrapper nhận params chung nhưng UI không truyền | Chưa triển khai mobile | P2* |
| 4.1 | Sort mới nhất/giá/diện tích tăng giảm | Không | Không | Không gửi sort; thứ tự mặc định server CX | Chưa triển khai control sort | P2* |
| 4.1 | Infinite scroll/refresh/loading/empty/error | Có | reqId/dedup/page | `{items,page,pages}` CX | Có code, race/error UX cần sửa | P2 |
| 4.1 | Detail giá/cọc/chi phí/area/amenities/terms/status | Có | GET + map | Detail shape CX | Có source; error/state/shape risks | P2 |
| 4.2 Ảnh | Cover danh sách | Có image0 | Ratio, contain | imageUrl helper | Có; không đồng đều chiều cao | P2 |
| 4.2 | Detail nhiều ảnh, swipe, counter | Có | FlatList ngang paging | images[] | Gần hoàn thành cơ chế; chưa test | P2 |
| 4.2 | Một ảnh/không ảnh | Có | Counter chỉ khi >1, emoji khi trống | Có fallback tĩnh | Có source | P3 QA |
| 4.2 | URL lỗi/loading ảnh | Chưa có placeholder loading/error riêng | getSize fail chỉ fallback height | Không upload/URL validation tại đây | Một phần | P2 |
| 4.3 Đăng tin | Title/description/address/price/contact | Có | Controlled inputs + POST | Payload 5 trường; DB CX | Một phần | P1/P2 |
| 4.3 | Area/type/amenities/deposit/extraCosts/terms | Không trong form | Không | Detail đọc nhiều field hơn create gửi | Chưa triển khai form; bắt buộc theo DTO/scope | P1*/P2* |
| 4.3 | Chọn/upload/preview/xóa ảnh | Không | Không | upload wrapper có, chưa nối | Chưa triển khai accommodation | P1*/P2* |
| 4.3 | Tối đa 8 ảnh | Không | Không | Không biết server limit accommodation | Chưa có căn cứ là requirement | Không tự gán priority bắt buộc |
| 4.3 | Required/numeric/format/messages | Required 2 trường silent; giá numeric keyboard | Validation tối thiểu | Server validator CX | Một phần, có lỗi UX | P2 |
| 4.3 | Chống đăng lặp/loading | Nút disabled khi loading | Không guard đầu handler/idempotency | Server duplicate control CX | Có cơ bản; chưa test double tap/latency | P2/P3 |
| 4.3 | Landlord/plan/quota/expiry | Banner/gate heuristic | Sai field; không quota/expiry | Enforcement server CX | Có code nhưng chưa đúng/đủ | **P1** gate; quota conditional |
| 4.3 | Chủ sở hữu/trạng thái/persistence/đến mine | Chuyển tab sau success | Không đọc created record/status | POST→GET mine; DB CX | Chưa chứng minh E2E | P1 xác minh |
| 4.4 Tin của tôi | List của current user | Có list dùng card chung | Không filter owner FE, tin server | GET mine | Có UI; ownership/paging/session CX | P1/P2 |
| 4.4 | Ảnh/title/price/empty/load/refresh | Có | Chung list hook | API mine | Có source | P2 gaps |
| 4.4 | available/rented/stopped + moderation riêng | Card không có status badges | Detail có listing status labels | Enum FE có; schema CX | Mine thiếu presentation; detail có | P2* |
| 4.4 | Xem chi tiết | Có card handler | id param | GET detail | Có source | P2 ID/shape risk |
| 4.4 | Sửa/xóa/đổi status | Không | Không handler accommodation | 3 wrappers chưa dùng | **Chưa nối mobile**, không “button giả” | P1* nếu owner CRUD trong scope |
| 4.4 | Reject reason/resubmit/view count | Không | Không | Không wrapper riêng rõ; schema CX | Chưa triển khai; ngoài scope6 mặc định | Conditional |
| 4.5 Quyền | Guest không phone; User xem contact/favorite | Có UI gate | user/isOwner/admin checks | Backend data filtering CX | Có UI; chưa xác nhận an toàn server | P1 xác minh/P2 UX |
| 4.5 | API auth/owner/direct-call resistance | Không phải việc ẩn nút | FE gắn Bearer | Middleware/controller CX | **Chưa đủ bằng chứng** | Không kết luận đã có lỗ hổng |
| 4.5 | Admin moderation | Không screen | Không handler | Admin wrappers chưa dùng | Chưa triển khai mobile admin | P1* nếu yêu cầu |
| 4.6 API/data | list/get/mine/create | Có caller | Axios/request | Source server/DB thiếu để review | Integration chưa xác minh | P1/P2 contract |
| 4.6 | Meta/update/status/delete/upload/moderate | Chưa nối | Wrapper tồn tại | Server endpoints thực tế CX | Không phải feature hoàn chỉnh | Conditional |

## V. Phân tích chi tiết

### 1. Danh sách và tìm kiếm

**Đã triển khai:** [screen:37](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:37>) có `tab`, `text`, `q`; submit tìm kiếm trim text vào q; list gửi `{page,limit:12,q}`. Hook tải trang1 khi dependencies đổi, refresh, tải thêm, bỏ response reqId cũ và dedup cơ bản. Card hiển thị giá/tháng, title hai dòng và district/area/roomType nếu có.

**Chưa thể xác nhận đúng dữ liệu tìm khu vực:** placeholder chỉ là nội dung UI. Không có controller/query DB, response mẫu hoặc kiểm thử so sánh quận/phường để xác minh `q` lọc address. Card chỉ hiện district; detail mới ghép full street/ward/district/city. Không báo thiếu full address ở detail vì code đã có.

**Thiếu trực tiếp scope1:** [TextInput:115](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:115>) không có X/clear handler. `onChangeText` chỉ đổi text; q đổi khi submit. Sau search A rồi xóa chữ, list vẫn search A cho đến submit lại. Cách sửa đề xuất: clear đồng thời text/q, tải page1 bằng cơ chế hook, reset filter/sort nếu sau này chúng được bổ sung và thuộc policy reset. Không cần gọi GPS hoặc thêm dependency tìm kiếm.

**Filter/sort:** không có khoảng giá/area/type/amenity controls, selected values hoặc sort options; không gửi params đó. Không thể gọi là “lọc nâng cao hoạt động”. Các tính năng này được ghi chưa triển khai, **không tự tính là thiếu task1** khi task chỉ nói tìm khu vực và X.

**Pagination:** [hook:54](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:54>) refresh và loadMore có thể chồng nhau; loadMore không kiểm refreshing, reqId mới có thể vô hiệu hóa refresh. `finally` loading từ request cũ chưa guard generation. Error chỉ render khi list rỗng; loadMore lỗi khi còn items có thể không hiện thông báo. Với refresh lỗi được hook chấp nhận, `replace=true` làm items bị xóa nên EmptyComponent sẽ hiện error; đây là policy bỏ dữ liệu cũ, khác trường hợp loadMore. Với mine, page không được truyền vào wrapper nên không được coi pagination đã đúng.

### 2. Chi tiết phòng và liên hệ

[Detail:100](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:100>) dùng `{listing,owner,isOwner,contactPhone}`; hiển thị full address, price, listing status, roomType, area, maxOccupants, deposit, availableFrom, electricity/water/internet/other, amenities và rentalTerms. Vì vậy không kết luận detail chỉ có UI title/price.

Guest có nút đăng nhập thay vì số điện thoại; user có phone nếu API trả; owner không thấy tim/chat; admin không thấy nút chat. Bấm gọi dùng RN Linking `tel:`; chat gọi start conversation với owner.userId rồi nhận conversationId. Không có bước gửi/chấp nhận connection trong flow accommodation; cần server policy để biết có được chat ngay hay không.

Effect có active cleanup, nhưng **success không xóa error**, trong khi `if(error)` trả màn lỗi trước data. Một lần lỗi rồi lần tải sau thành công có thể vẫn bị màn error chặn. Không có nút retry trực tiếp. Các dereference listing/owner và `imageUrl(path)` còn tin shape; response thiếu object hoặc ảnh không phải string có thể gây lỗi runtime, chưa tái hiện trên thiết bị.

Chi phí bằng0 đang bị ẩn do truthiness tại [detail:174](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:174>),179,183. Nếu0 có nghĩa miễn phí, nên hiển thị miễn phí/0 thay vì coi thiếu dữ liệu; cần thống nhất semantics. Mapping listing status có available/rented/stopped; moderation là enum riêng, không dùng hai loại thay thế nhau.

### 3. Hình ảnh list/detail

**List:** [cards:33](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:33>) lấy `images[0]` làm cover; `Image.getSize` tính `(h/w)*(screenWidth-24)` rồi RN Image `contain`; thiếu ảnh có placeholder nhà. Không có carousel/counter ở card. Nếu yêu cầu swipe chỉ ở detail thì đây không phải thiếu scope; nếu phải swipe cả list thì cần xác nhận và bổ sung card carousel.

**Detail:** [Gallery:177](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:177>) dùng FlatList horizontal + pagingEnabled; mỗi ảnh rộng bằng window width; counter `index+1/images.length` khi nhiều ảnh; trống dùng emoji fallback. Đây là component RN cơ bản, phù hợp mức project sinh viên, không bắt buộc library carousel.

`contain` giữ tỷ lệ ảnh bên trong khung, không tự làm méo/cắt ảnh; tỷ lệ ảnh khác nhau có thể để khoảng trống. Chiều cao cả gallery lấy từ **ảnh đầu**, không tự thay đổi theo ảnh đang xem. Card có chiều cao thay đổi theo từng cover, nên không phải list ảnh đồng đều. Chưa clamp ảnh quá cao; callback getSize cũ có thể cập nhật chiều cao cho URI mới; Gallery index chưa reset/clamp khi bộ ảnh đổi.

URL ảnh được chuẩn hóa bằng helper dùng SERVER_URL; khác lỗi hardcoded host của module chat trước đó. **Không gán lỗi host chat cho ảnh accommodation.** Tuy nhiên `getSize` fail chỉ đổi chiều cao; `<Image>` không có onError placeholder hoặc image loading indicator. URL có giá trị nhưng lỗi sẽ không chuyển sang emoji “không ảnh”. Chưa đo FPS/memory hay thử ảnh thực trên Android, không khẳng định swipe giật/OOM.

Theo [RN Image](https://reactnative.dev/docs/image) và [FlatList](https://reactnative.dev/docs/flatlist), các API hiện dùng phù hợp việc hiển thị ảnh và paging; không cần thay stack. Nên đo chiều rộng container thực nếu dùng card ở Favorites padding khác, giới hạn chiều cao và thử các ảnh ngang/dọc/rất cao.

### 4. Đăng tin: form, API, dữ liệu

[Form:199](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:199>) có đúng 5 trường: title, description, price, address, contact. Không có area, roomType, amenities, maxOccupants, deposit, availableFrom, extraCosts, rentalTerms, image picker/upload/preview/remove. Detail đọc các field này từ API, nhưng **chưa biết trường nào server yêu cầu khi create**.

Payload thực tế:

```text
POST /api/accommodations
{
  title: trimmed string,
  description: trimmed string,
  price: Number(price) hoặc 0 nếu bỏ trống,
  address: trimmed string,
  contact: trimmed string
}
```

Token được interceptor gắn nếu có. FE không truyền ownerId, điều này có thể đúng nếu server lấy user từ token; **không được tự kết luận bài thiếu chủ sở hữu**. Cũng không được tin server đã kiểm owner khi chưa xem controller.

Validation chỉ title/address nonempty; lỗi thì return không message. Giá âm/NaN/giá0/format contact chưa được xác thực; numeric keyboard không thay validation. API reject chỉ console. Thành công chỉ chuyển tab mine, không đọc created ID/status, không có thông báo thành công/chờ duyệt hoặc quota. Nút disabled/loading đã có, nên không báo “không chống submit gì”; vẫn cần guard đầu handler và thử double tap với latency nếu cần.

Contract cần đối chiếu: create address string nhưng read detail address object; create contact là chuỗi có thể “Zalo / SĐT” nhưng detail nhận contactPhone từ response. Backend có thể map/tách field; hiện **chưa chứng minh sai endpoint hay POST chắc chắn fail**. Trước nghiệm thu “đăng được”, cần POST được phép bằng account test rồi GET mine/detail, đóng/mở app và kiểm DB/server persistence.

[Uploads API](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/uploads.js:3>) tồn tại nhưng form này không gọi. Chọn/upload tối đa 8 ảnh là implementation ở Pass, **không phải chứng cứ limit 8 của accommodation**. Chỉ bổ sung giới hạn ảnh theo schema hoặc scope được xác nhận; có thể tái dùng upload wrapper thay vì cài thêm thư viện.

### 5. Tin của tôi và quản lý bài

[Mine fetch:78](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:78>) gọi myAccommodationsApi nếu gate true. UI reuse AccommodationCard, có loading/refresh/empty/error và mở detail. Không có checkbox giả/màn trống placeholder; đây là list thật nối API ở mức code.

Những phần chưa có: owner card/status/moderation badge, reject reason, edit/delete/change-status buttons, resubmit, views. Detail có status phòng nhưng không owner controls. Wrapper PUT/PATCH/DELETE tồn tại mà **không có caller**, nên không gọi quản lý CRUD đã hoàn chỉnh. Tách việc5 “tạo giao diện Tin của tôi” khỏi việc mở rộng CRUD: cần thống nhất scope trước khi buộc Tiến Dũng triển khai cả quản trị.

`myAccommodationsApi()` không nhận page/q; hook vẫn đọc page/pages và loadMore. Nếu mine response là một trang đúng shape thì dùng được; nếu paginated thì mỗi lần loadMore vẫn cùng request mặc định; nếu trả mảng hoặc `{items}` thì cần adapter. Không có response để chọn giả thuyết nào đúng.

List dependencies chỉ `[q,tab,isVipUser]`, không user identity. Với thay user mà boolean quyền không đổi, hook không tự reset/refetch; có nguy cơ dữ liệu mine cũ. Logout/login qua trạng thái guest có thể làm boolean đổi và refetch, **không khẳng định mọi lần đổi tài khoản đều giữ nguyên**. Nên gắn cache/request với session id.

### 6. Auth, quyền và UX

Gate mine/create là cùng `checkIsVip`, không có policy riêng view-own/manage/create. Guest bị đưa banner nâng gói và nút sang Account, rồi mới LoginPrompt; không có thông báo login trực tiếp tại hai tab. Screen bỏ qua AuthContext.loading nên có thể hiện upsell trong lúc khôi phục user.

Mô hình người dùng đưa ra coi Landlord và gói/quota là các điều kiện riêng. Code lại chỉ dò substring pro/plus trong một nhóm field tùy đoán; `isLandlord` chỉ được hiển thị tại Account. Cần một chính sách đã xác nhận, không suy diễn paid plan luôn đồng nghĩa quyền chủ trọ. Không tự khóa quản lý tin đã có khi hết quota tạo mới nếu nghiệp vụ chưa quy định.

Ba khu vực Tìm phòng/Tin của tôi/Tin mới là Segments trong **cùng route**, không phải ba screen độc lập. Bấm Back không được gắn handler đổi segment, nên dự kiến theo navigator/history chứ không bảo đảm quay từ create về search; đây cần UX policy/test, không phải crash chắc chắn. Form dùng ScrollView thuần, chưa KeyboardAvoidingView/keyboardShouldPersistTaps/inset như các shared helper đã có. Khả năng nút bị keyboard/system bar che cần thử Android màn nhỏ. Màu dark/slate/indigo nhất quán phần lớn UI ROOMIE; root StatusBar dark cần kiểm contrast thiết bị.

Hook vẫn fetch public list khi tab=create hoặc mine bị chặn, vì nhánh fetcher else luôn gọi list. Đây là request thừa phía sau form/banner, không phải bằng chứng lỗi quyền API. Có thể thêm enabled flag hoặc chỉ tải khi view list cần; không cần state framework lớn.

## VI. Role & Permission Matrix

### 1. Mô hình dự kiến so với source hiện tại

User đưa mô hình Guest/User/Landlord/Admin làm nguồn nghiệp vụ dự kiến. Trong source chỉ thấy rõ guest qua user null, admin qua `user.role`, landlord flag được Account hiển thị và plan qua `currentPlan`. **Chưa có User schema xác nhận Landlord là role riêng hay flag của User.** Không được tự đổi model này khi chưa có contract.

| Quyền | Guest trong FE | User trong FE | Landlord theo mô hình dự kiến | Admin trong FE | Kiểm tra server |
|---|---|---|---|---|---|
| Xem/tìm list và detail | Có | Có | Có nếu API public | Có | Public eligibility/filter server CX |
| Xem phone | Bị ẩn, hiện login | Hiện khi response có contactPhone | Tương tự user | Tương tự user | Chưa biết response guest có giấu phone hay chỉ UI giấu |
| Favorite | Bấm tim → login nếu !isOwner | Có nếu !isOwner | Có nếu !isOwner | Code không cấm admin favorite riêng | Auth/target ownership API CX |
| Mở chat chủ trọ | Không hiện | Hiện nếu !isOwner | Hiện nếu !isOwner | Bị ẩn | Quyền start/chat/canSend do server CX |
| Mở form Đăng tin | Gate false | Có thể mở nếu field heuristic có plus/pro, **không kiểm landlord** | **Không chắc mở**, currentPlan/isLandlord bị bỏ qua | Không tự có quyền; phụ thuộc heuristic | Middleware create/quota/expiry CX |
| Xem Tin của tôi | Gate false | Cùng gate heuristic | **Không chắc mở**, kể cả đã sở hữu tin | Không tự có quyền | GET mine owner filtering CX |
| Sửa/xóa/đổi status tin mình | Không có UI | Không có UI | Wrapper có, không UI/handler | Không UI accommodation management riêng | Ownership/mutation server CX |
| Sửa/xóa tin người khác | Không có UI | Không có UI | Không có UI | Admin wrapper delete có nhưng chưa caller | Không thử vượt quyền; không kết luận có/không lỗ hổng |
| Duyệt/từ chối | Không UI | Không UI | Không UI | Chỉ wrapper admin; chưa moderation screen | Role guard/schema/status update CX |

Bằng chứng chính: [gate:46](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:46>), [detail controls:222](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:222>), [Account flags:41](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/account.tsx:41>), [admin wrappers:11](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/admin.js:11>).

### 2. Kết quả thử predicate quyền

Đã lấy initializer `checkIsVip` đúng từ AST file hiện tại, transpile TypeScript trong bộ nhớ, chạy Node VM và truyền 5 object giả lập. Không viết test file, không thay code, không dùng tài khoản hoặc dữ liệu người thật.

| Input giả lập | Kết quả hàm hiện tại | Ý nghĩa |
|---|---|---|
| `null` | false | Guest bị khóa cả create/mine |
| `{role:'user',isLandlord:true,currentPlan:'plus'}` | **false** | Flag chủ trọ và gói được Account dùng không làm gate mở |
| `{role:'user',isLandlord:false,plan:'plus'}` | **true** | Có field plan thay thế là mở UI dù không landlord |
| `{role:'admin'}` | false | Admin không được nhận diện bằng quyền riêng |
| `{role:'landlord',isLandlord:true,currentPlan:'pro'}` | **false** | Ngay cả mô hình role landlord dự kiến cũng bị khóa nếu không có field heuristic khác |

Đây là bằng chứng thực thi **hàm thuần**, không phải kết quả thử trên account server. Hành vi UI sai với các input này được xác minh; **quyền mutation phía server vẫn chưa biết**. Không suy ra người không phải chủ có thể tạo/xóa bài bằng API từ kết quả UI gate.

### 3. Plan/quota/expiry và policy cần chốt

[Subscription:33](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx:33>) có bảng gói fallback, trong đó Plus/Pro có số tin hardcode. Đây không phải bằng chứng server quota hoặc hợp đồng Tiến Dũng phải triển khai chúng. Không thấy remaining quota/expiry được AccommodationScreen đọc, không có model phân quyền chuẩn hoặc guard server để kiểm.

Các câu cần trả lời từ contract trước khi sửa: ai được tạo; landlord được biểu diễn bằng role hay flag; plan hợp lệ ở field nào; có quota/hết hạn không; hết quyền tạo mới có còn xem/sửa/đóng/xóa bài đã sở hữu không; admin quản lý ở web hay mobile. Những câu này cần nghiệp vụ/source backend, **không giải quyết bằng dò thêm tên field**.

## VII. API & Data Flow Report

### 1. Endpoint và mức sử dụng

Tất cả path dưới đây có prefix `/api` từ Axios. **CX server** trong bảng nghĩa là không có controller/service/model/DB code hoặc kết quả HTTP hợp lệ để kiểm tra, không phải kết luận endpoint không tồn tại.

| Endpoint / method | Request phía client | Response phía FE đang mong đợi | Controller/service/database | Màn hình sử dụng |
|---|---|---|---|---|
| GET `/accommodations` | page, limit12, q | `{items,page,pages}`; card fields id/images/title/price/address.district/area/roomType | CX server; search và public policy CX | Tìm phòng; còn bị gọi thừa ở create/blocked mine |
| GET `/accommodations/meta` | Không params | Wrapper trả response.data, chưa có consumer shape | CX server | **Chưa dùng**; không chứng minh filter metadata hoạt động |
| GET `/accommodations/:id` | id từ route | `{listing,owner,isOwner,contactPhone,isFavorite}` | CX server; visibility/contact filtering CX | Detail |
| GET `/accommodations/mine` | **Không page/limit/q** | Dùng chung hook nên mong `{items,page,pages}` | CX server; ownership/pagination CX | Mine khi gate true |
| POST `/accommodations` | title,description,price,address string,contact | Body response bị bỏ qua; success khi Promise resolve | CX server; owner assignment/validation/DB save/status/quota CX | Create form |
| PUT `/accommodations/:id` | Wrapper nhận data bất kỳ | Không consumer | CX server; schema/ownership CX | **Chưa nối** |
| PATCH `/accommodations/:id/status` | `{status}` | Không consumer | CX server; enum và transaction CX | **Chưa nối** |
| DELETE `/accommodations/:id` | id | Không consumer | CX server; owner check/delete persistence CX | **Chưa nối** |
| POST `/uploads/images` | Multipart images | Caller Pass nhận URL[] hoặc `{urls}`; accommodation chưa consumer | CX server/storage/limit/mimetype | Có wrapper, **chưa nối form phòng** |
| GET `/admin/listings` | Wrapper nhận params | Chưa consumer | CX server/admin guard | **Chưa có UI mobile** |
| PATCH `/admin/listings/:kind/:id/moderation` | `{status,note}`; kind enum chưa rõ | Chưa consumer | CX server/moderation DB operations | **Chưa nối** |
| DELETE `/admin/listings/:kind/:id` | kind,id | Chưa consumer | CX server/admin guard | **Chưa nối** |
| GET `/auth/me`, POST `/auth/login` | Bearer hoặc email/password | me user/profile; login token/user/profile | CX server/token semantics | AuthProvider/Login, ảnh hưởng gate |
| GET/POST/DELETE favorites | type query / `{targetType,targetId}` / target path | GET `{items}`; mutation body không dùng | CX server/user relation | Favorites và detail |
| POST `/conversations/start` | `{userId:owner.userId}` | `{conversationId}` | CX server/eligibility | MessageOwnerButton từ detail |
| GET `/billing/me` và gói | Wrapper billing không dùng; Subscription gọi paths subscriptions khác | Shape/entitlements chưa thống nhất | CX server/quota/expiry | Accommodation không gọi kiểm entitlement authoritative |

Bằng chứng toàn bộ API accommodation: [service:5](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:5>); consumers: [list:76](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:76>), [create:214](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:214>), [detail:63](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:63>). Không có endpoint/handler riêng được xác minh cho resubmit hoặc view count; không tự thiết kế API mới trong audit.

### 2. Schema/model suy ra từ UI

```text
CreateAccommodationPayload hiện tại:
  title, description, address, contact: string
  price: number

Accommodation list item được FE dùng:
  id hoặc _id, title, price, images:string[],
  address:{district?}, area?, roomType?

Accommodation detail được FE dùng:
  listing:{id?,_id?,title,description,images:string[],price,
    address:{street?,ward?,district?,city?},status,roomType?,area?,
    maxOccupants?,deposit?,availableFrom?,extraCosts?,amenities?,rentalTerms?}
  owner:{userId,displayName}
  isOwner:boolean, isFavorite:boolean, contactPhone?:string

Enum frontend (chưa xác nhận schema server):
  listing status: available / rented / stopped
  moderation: pending / approved / rejected
  roomType: single / shared / studio / apartment / house
```

`id/_id` không đủ xác định MongoDB. Không có database local cho listing; chỉ token native SecureStore, list/form state RAM, server REST là nơi FE kỳ vọng persistence. Không có offline queue hoặc cache bền vững; đây không tự là thiếu yêu cầu môn.

Điểm cần map: address string vs object; contact vs contactPhone; list key id vs card id/_id; mine pagination; nullable costs/area và enums. Backend có thể có transform/DTO riêng; **chỉ khi có contract hoặc response mới kết luận mismatch làm lỗi runtime thực sự**.

### 3. Bất biến nghiệp vụ

| Bất biến | Bằng chứng phía mobile | Phần còn chưa biết |
|---|---|---|
| Bài thuộc đúng creator | POST không nhận ownerId từ form, interceptor gắn token | Controller có lấy principal và gán owner chính xác không |
| Chỉ người có quyền được tạo | Có gate UI nhưng predicate đang sai | API có auth/landlord/plan/expiry/quota validation không |
| Mine chỉ bài current user | Gọi `/mine`, không truyền owner tùy ý | Query server có lọc đúng current user; response có scope/shape gì |
| Người khác không sửa/xóa | Mobile chưa có các UI actions | PUT/PATCH/DELETE có ownership checks, không thử direct-call exploit |
| Public chỉ approved/available nếu policy như vậy | FE không gửi/ép điều kiện riêng | Server query có enforce không; không khẳng định lọt tin chưa duyệt |
| Status được lưu và UI cập nhật | Detail hiển thị listing status, wrapper PATCH chưa nối | Controller/DB enum/state transitions và refetch sau mutation |
| Moderation khác trạng thái phòng | FE có hai map labels tách biệt | Schema server có phân tách và quyết định visibility đúng không |
| Limit ảnh/quota có authoritative check nếu áp dụng | Form chưa có ảnh; entitlement heuristic; quota fallback static | Backend/storage limits và business requirement thật sự |
| Dữ liệu còn sau restart | FE POST rồi GET lại, state mobile không lưu bền | DB save và round-trip authenticated chưa được kiểm chứng |
| Guest không nhận dữ liệu phone nếu yêu cầu privacy | UI ẩn phone | API có loại phone khỏi response guest hay vẫn gửi về client |

### 4. Truy vết 5 flow end-to-end

**Flow1 — Tìm phòng:** User mở tab → list hook → GET page1 → cards → nhập text/submit → q→GET. **Filter/sort controls chưa có; X/Reset chưa có.** Có thể xóa chữ và submit rỗng nhưng không thay thế yêu cầu nút X. Card → route id → GET detail → Gallery swipe → guest login hoặc user tel/chat. Search address/persistence và dialer runtime chưa xác minh.

**Flow2 — Đăng tin:** User → **heuristic gate hiện tại, chưa xác nhận Landlord/plan** → form 5 trường → required check tối thiểu → POST. **Không có picker/upload trong flow phòng.** Database/status do server CX → Promise resolve → setTab mine → GET mine → cards. Chưa chứng minh bài thật được lưu, trạng thái pending/approved hoặc hiện đúng creator.

**Flow3 — Quản lý tin:** Gate → mine GET → card → detail. **Luồng dừng ở xem:** không nút/handler edit-delete-status; wrappers không tạo thành UI flow. Reject reason/resubmit/views chưa có và chưa xác nhận scope bắt buộc.

**Flow4 — Phân quyền:** guest/user/landlord/admin → gate pro/plus hoặc user/isOwner/admin conditions tùy màn → render banner/list/form/contact. Gate không dùng role/flag/plan thống nhất; direct HTTP auth/ownership server **chưa thể truy vết**. Không coi ẩn nút đã an toàn.

**Flow5 — Duyệt bài:** create POST → **status response không đọc/không hiển thị moderation** → admin có wrappers nhưng không UI/code server → approve/reject DB/visibility **không kiểm chứng**. Không tuyên bố workflow duyệt hoạt động; nếu phần admin nằm ở web/repo khác cần bổ sung bằng chứng đúng nơi đó.

## VIII. Danh sách tất cả lỗi và thiếu sót

### 1. Quy ước

- **Thực tế/source:** có chứng cứ code hoặc kiểm tra hàm/CLI; không mặc định đã tái hiện APK.
- **Nguy cơ:** kịch bản cụ thể, cần response/backend/runtime để xác nhận ảnh hưởng.
- **Conditional:** chỉ bắt buộc nếu scope/rubric/API contract xác nhận. Khoảng trống audit server được mô tả là chưa kiểm chứng, không gán thành lỗ hổng đã xảy ra.
- Không có P0 được xác minh. Không tự gán P0 cho CRUD/filter/quota chưa xác nhận là bắt buộc.

### 2. Vấn đề hiện trạng có bằng chứng, sắp theo ưu tiên

| ID | Priority | Chức năng | Mô tả | File/dòng code | Bằng chứng | Ảnh hưởng | Hướng sửa | Bắt buộc hay tùy chọn |
|---|---|---|---|---|---|---|---|---|
| ACC-01 | **P1** | Scope1 / search | Thiếu nút Xóa tìm kiếm | [index:115](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:115>) | Chỉ TextInput, không X/clear handler trong JSX/module | Không đáp ứng một phần nhiệm vụ tường minh | Thêm clear text+q, về page1, cập nhật kết quả | **Must Fix scope1** |
| ACC-02 | **P1** | Scope4 / quyền | Gate bỏ currentPlan/isLandlord, dùng substring; mine/create dùng cùng policy | [index:46](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:46>), [99](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:99>), [Account:41](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/account.tsx:41>) | Hàm thuần với landlord/currentPlan plus/pro trả false; plan plus + isLandlord false trả true | Chặn nhầm hoặc mở sai UI theo mô hình dự kiến; **không chứng minh bypass API** | Chốt User/entitlement contract; gate login/role/create/manage riêng, dùng field chuẩn | **Must Fix scope4**, server enforcement phải xác minh |
| ACC-03 | **P1 – nguy cơ** | Scope2 / create integration | Create/read DTO chưa thống nhất và chưa nghiệm thu POST→mine→detail | [payload:214](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:214>), [detail:100](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:100>) | address string vs nested object; contact vs contactPhone; POST response bị bỏ | Có thể fail validator/mất hiển thị address/contact nếu server không map; chưa chứng minh lỗi server | Xác minh contract/required fields/response; map đúng rồi test được phép bằng account test và persistence | **Must Verify scope2**; sửa theo kết quả, không đoán path/schema |
| ACC-04 | **P1 – hạ tầng dùng chung** | Chất lượng/chạy project | Lint/typecheck chưa đạt | [Tabs:26](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx:26>), [UI:59](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:59>), [hook:49](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:49>) | Typecheck 13 diagnostics; lint 16 lỗi/4 cảnh báo toàn project; không phải tất cả thuộc accommodation | Checks fail; chưa chứng minh APK không build | Sửa shared Tabs/ref/hook và lỗi repo liên quan; chạy lại sau sửa; không broad-ignore để che | Must Fix chất lượng trước chốt bản; không quy hết cho Tiến Dũng |
| ACC-05 | P2 | Search UX | text và applied q lệch khi người dùng xóa chữ mà chưa submit | [index:38](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:38>), [120](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:120>) | onChange chỉ setText; q chỉ đổi onSubmit | Ô trống nhưng vẫn kết quả query trước | Clear action reset cả hai; có UX cho query đã áp dụng hoặc search policy rõ | Should Fix, cùng ACC-01 |
| ACC-06 | P2 | Create form | Validation và feedback thiếu | [index:208](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:208>), [217](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:217>), [223](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:223>) | Required fail silent; giá Number/rỗng0; API lỗi console | Người dùng không biết không đăng được; payload số sai có thể tới server | Required/numeric/range/contact theo contract; inline/alert lỗi và success; guard submit | **Must Fix feedback để demo scope2**, validation Should Fix |
| ACC-07 | P2 – nguy cơ | Mine/session | List không gắn user identity; auth loading không được dùng | [index:40](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:40>), [81](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:81>) | Deps chỉ q/tab/isVip boolean | Đổi user cùng gate có thể không refetch; upsell lúc bootstrap; dữ liệu cũ có thể ló/giữ trong UI | Guard auth loading, reset/abort/request generation theo userId | Should Fix và thử account switching |
| ACC-08 | P2 – nguy cơ | Pagination | Refresh/loadMore và finally có race | [hook:49](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:49>), [54](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:54>), [61](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:61>) | loadMore không chặn refreshing; reqId chung; finally không guard | Refresh bị response mới vô hiệu hóa, spinner không phản ánh request đang chạy | Chặn overlap, reset generation/cursor, guard finally | Should Fix, kiểm tra latency |
| ACC-09 | P2 – contract | Mine pagination | Mine không gửi page nhưng dùng loadMore và hook paginated | [API:8](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:8>), [fetch:78](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:78>) | Cùng GET không params mọi lần; response chưa có | Nếu server paginated có thể lặp page1; shape khác có thể không render | Xác minh response; truyền page theo API hoặc dùng one-page adapter, bỏ loadMore nếu không cần | Must Verify cho mine, sửa tùy contract |
| ACC-10 | P2 – nguy cơ | List IDs | Key/dedup không thống nhất id/_id | [key:133](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:133>), [card:40](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:40>), [dedup:30](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts:30>) | key chỉ id; card id||_id; hook id??userId | Nếu API chỉ _id, key sai/dedup rơi item; chưa biết response thật | Chuẩn hóa ID một chỗ theo DTO; stable key, không random | Should Verify/Fix |
| ACC-11 | P2 | Detail errors | Error cũ không reset khi GET sau thành công; thiếu retry | [detail:61](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:61>), [92](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:92>) | success chỉ setData/setFav; if(error) trước render data | Có thể giữ màn lỗi sau hồi phục request theo id/user | Clear error/loading đúng thời điểm, thêm Retry; giữ active guard đang tốt | Should Fix |
| ACC-12 | P2 | Scope3 / ảnh | Kích thước theo tỷ lệ không clamp, list không đồng đều chiều cao | [cards:24](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:24>), [Gallery:198](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:198>) | Ratio cover/ảnh đầu nhân window width | Ảnh cao chiếm màn; ảnh khác ratio có khoảng trống; performance chưa đo | Chốt khung list/detail hợp lý, clamp chiều cao/container width, giữ contain theo mục tiêu | Should Fix/QA scope3; không khẳng định méo ảnh |
| ACC-13 | P2 | Ảnh lỗi/loading | Có URL nhưng tải lỗi không chuyển placeholder; không indicator loading ảnh | [card Image:59](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:59>), [Gallery Image:230](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:230>) | getSize error chỉ đổi height; không onError image state | Khung trống với URL sai/expired, không có Retry/message | Loading/error state và fallback image/emoji; thử invalid URLs | Should Fix |
| ACC-14 | P2 – nguy cơ | Gallery lifecycle | Index không reset/clamp, callback dimension cũ có thể ghi height mới | [Gallery:187](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:187>), [effect:191](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:191>), [cards effect:19](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx:19>) | Không cleanup/request key callback; index giữ khi images đổi | Counter vượt số ảnh hoặc chiều cao lệch sau đổi data | Reset/clamp index khi identity/images đổi; ignore callback stale | Should Fix nếu có data updates; thử runtime |
| ACC-15 | P2 – nguy cơ | Favorites/liên hệ phụ | Mutation tim không busy; rollback silent; favorites request không guard khi type/user đổi | [toggle:79](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:79>), [favorites:18](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/favorites.tsx:18>) | POST/DELETE liên tiếp, response cũ setItems | UI favorite lệch server hoặc render sai loại trong Favorites | Serialize/busy + error message, request guard/reset theo type/session | Should Fix, luồng phụ |
| ACC-16 | P2 – nguy cơ | Response validation | Tin shape listing/owner/ảnh/phân trang trực tiếp | [detail:100](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:100>), [owner:220](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:220>), [imageUrl:21](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:21>) | any; owner.displayName, path.startsWith, data.items không guard shape | Malformed/null response có thể crash; chưa thấy response thực gây lỗi | Typed DTO/JSDoc + guard tối thiểu; not-found/error UI, normalize images/list | Should Verify/Fix; không gọi crash đã tái hiện |
| ACC-17 | P2 – cần test | Form mobile/back | ScrollView chưa keyboard/inset handling riêng; segment không có Back policy | [form:230](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:230>), [Segments:87](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:87>) | Không KeyboardScreen/inset/keyboardShouldPersistTaps tại form; segment là state | Keyboard có thể che field/button, Back rời route thay vì đổi segment; chưa chạy Android | Tái dùng helper nếu cần; chốt Back policy, test màn nhỏ/bàn phím | Should Test/Fix UX, không coi blocker chắc chắn |
| ACC-18 | P3 | Hiệu suất | Public GET vẫn chạy sau form/banner | [fetch:76](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:76>) | Hook chạy mọi tab, else public | Request thừa, có thể spinner/state đổi phía sau view | Enabled hoặc tách load theo tab cần, không thêm layer lớn | Optional |
| ACC-19 | P3 | Detail data UX | Chi phí0 ẩn, dialer không catch; hướng nâng gói gián tiếp | [cost:174](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:174>), [tel:226](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:226>), [upgrade:188](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:188>) | Truthy costs; openURL không catch; nút upgrade sang Account | Miễn phí có thể trông như thiếu; launch lỗi không feedback; guest bị upsell vòng | null-check, display0/free; catch Linking; login/upgrade navigation rõ | Optional/Should UX |
| ACC-20 | P3 | Bảo trì | API/response any, form nằm route, palette lặp | [index:199](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:199>), [API](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:1>) | Không DTO thống nhất, styles/helper phân tán | Dễ đổi field lệch; chưa phải overengineering | Vài types/helper theo contract; tách form khi thực sự sửa nhiều, không rewrite module | Optional |

**Tổng 20 mục hiện trạng: 4 P1, 13 P2, 3 P3.** ACC-03 là rủi ro cần xác minh contract; ACC-04 là vấn đề hạ tầng repo dùng chung. Không quy tất cả cho phần việc cá nhân và không cộng các mục conditional bên dưới vào lỗi bắt buộc hiện tại.

### 3. Chức năng chưa triển khai, mức bắt buộc còn conditional

| ID | Priority nếu scope được xác nhận | Chức năng / bằng chứng | Thiếu ở đâu | Ảnh hưởng / đề xuất | Bắt buộc hiện tại? |
|---|---|---|---|---|---|
| EXT-01 | P1/P2 theo DTO | Full form và upload ảnh — [form:229](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:229>), [upload API:3](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/uploads.js:3>) | Không area/type/amenities/deposit/extraCosts/terms/picker/upload/preview/remove | Thiếu nếu field API/rubric yêu cầu; nối upload và validation trước POST. Limit8 chỉ dùng nếu xác nhận | **Chưa tự coi bắt buộc toàn bộ** |
| EXT-02 | P1 nếu giao owner CRUD | Sửa/xóa/đổi trạng thái, moderation/status mine — [unused wrappers:10](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:10>) | Không owner buttons/forms/handlers/refetch | Nối API đã có sau kiểm contract/ownership; status phòng tách moderation | Scope5 chỉ yêu cầu UI mine, **chưa xác nhận toàn CRUD** |
| EXT-03 | P2 | Filters/sort/reset nâng cao — [query params:80](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:80>) | Không UI/state/params giá/area/type/amenities/sort | Bổ sung theo server semantics và reset page1, giữ request generation thống nhất | **Ngoài scope6 mặc định**; X vẫn bắt buộc ACC-01 |
| EXT-04 | P1 nếu phải có admin mobile | Moderation/reject reason/resubmit/views — [admin wrappers:11](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/admin.js:11>) | Chưa UI/server source; resubmit/views không endpoint xác minh | Nếu đã triển khai web/repo khác, cần evidence integration; không tự xây mới khi chưa có scope | **Chưa xác nhận** |
| EXT-05 | P1 nếu policy bắt buộc | Quota/expiry/limit ảnh/API data privacy/direct-call authorization — [gate:46](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:46>), [axios:12](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/axios.js:12>) | Không authoritative implementation trong source đang có | Kiểm middleware/controller/schema/API test được phép; sửa theo policy; không kết luận vượt quyền thành công | Server auth/ownership cần **xác minh**; policy quota/8 ảnh không tự bắt buộc |

### 4. Phân biệt lỗi module và lỗi toàn project

Lần chạy này dùng CLI cục bộ, không install/fix:

```text
node node_modules/expo/bin/cli lint --no-cache
→ exit 1; 16 errors, 4 warnings

node node_modules/typescript/bin/tsc --noEmit --incremental false
→ exit 1; 13 diagnostics
```

Trực tiếp liên quan list module: lint set-state-in-effect tại hook:49; type Tabs initialRouteName tại tabs layout:26. Shared UI KeyboardScreen có 4 diagnostics ref/measure/implicit any nhưng **form phòng hiện chưa dùng wrapper này**. Phần còn lại thuộc starter theme/tabs và profile/subscription ở toàn repo. Không báo tất cả 13 diagnostics là lỗi source accommodation, không tự suy ra Metro/APK fail. AGENTS yêu cầu chạy hai kiểm tra, đã thực hiện; khuyến nghị sửa failures trước chốt bản không phải rubric chấm điểm được xác minh.

## IX. Kế hoạch hoàn thiện

Các bước dưới đây là **đề xuất**, chưa sửa code/chạy mutation. Không cần tái cấu trúc toàn ứng dụng.

### 1. Must Fix / Must Verify trước demo sáu đầu việc

| Thứ tự | Việc | File cần xử lý/đối chiếu | Nội dung | Dependency / điều kiện hoàn tất |
|---|---|---|---|---|
| M1 | Chốt contract/phân quyền và test accounts | [API accommodation](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js>), [Auth](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js>), backend/schema chưa có | Xác nhận User role/flag/plan, required create fields, address/contact, list/mine response, public visibility; quota/8 ảnh chỉ nếu áp dụng | Là đầu vào M2/M4; không đổi payload/endpoint theo phỏng đoán |
| M2 | Sửa gate scope4 | [index:46](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:46>) | Login/loading rõ; dùng field contract; phân biệt xem/quản lý tin của mình với tạo mới; không substring | Sau M1; kiểm Guest/User/Landlord/Admin và server rejection thực tế khi được phép |
| M3 | Hoàn tất nút X scope1 | [index:115](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:115>), [hook](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts>) | Clear text+q; page1; clear result/error states theo policy; không cần thêm dependency | Có thể làm song song M1/M2; xác minh q tìm theo khu vực bằng data test |
| M4 | Hoàn tất create cơ bản và feedback | [form:199](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:199>), [API:9](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js:9>) | Required/numeric validation, server error/success, payload đúng DTO, nhận status/id nếu API trả; upload nếu schema/scope bắt buộc | Sau M1/M2; POST hợp lệ → mine đúng owner → detail đúng fields → mở lại còn dữ liệu |
| M5 | Sửa checks hạ tầng và xác nhận APK | [tabs layout](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/_layout.tsx>), [hook](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts>), [shared UI](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx>), [config](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/eas.json>) | Sửa errors thuộc modules tương ứng; không quy hết cho người làm Tìm trọ; lint/typecheck lại sau sửa; build/install/test Android khi được cho phép | Không nâng stack tùy ý; build thành công chưa thay test data flows |

### 2. Should Fix để ổn định module

| Thứ tự | File | Nội dung sửa đề xuất | Dependency |
|---|---|---|---|
| S1 | [list/hook](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts>) và [screen](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx>) | Session key, mine pagination adapter, refresh/loadMore overlap, stable IDs, error ngoài EmptyComponent | M1 xác nhận response/id |
| S2 | [detail](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx>) | Reset error/loading, Retry/not-found/shape guard, validate owner/images; giữ active cleanup | Có thể làm song song M3/M4 |
| S3 | [cards](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx>), [Gallery](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx:177>) | Chốt kích thước list/detail, clamp, placeholder lỗi/loading, counter reset, stale callback guard | Scope3; thử nhiều ratio/URL lỗi/một-nhiều-không ảnh |
| S4 | [form](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx:230>) | Keyboard/inset/taps, input formats, required/error labels, chống submit lặp | M4 rồi thử thiết bị; không giả định keyboard crash |
| S5 | [favorites](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/favorites.tsx>), [detail toggle](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx:79>) | Busy/rollback messages, focus/type/session guard; catch Linking failure | Luồng phụ, sau create/quyền/search |

### 3. Optional hoặc chỉ làm sau khi scope xác nhận

- Owner edit/delete/status và mine badges; advanced filters/sort/reset; image swipe trong card; report/resubmit/views/admin mobile. Chọn theo phân công/rubric, không thêm toàn bộ để “đủ công nghệ”.
- Quota/expiry/8 ảnh theo server policy; không lấy số quota fallback UI làm chuẩn.
- Dọn repeated styles, tách CreateAccommodationForm thành component nếu file tăng; vài DTO/JSDoc; README feature/demo. Không cần Clean Architecture/Redux/DB local mới.
- Sửa minor cost0/upgrade destination/accessibility và tối ưu request ẩn sau form/banner.

### 4. Acceptance tests để chốt tiến độ bằng bằng chứng

| Nhóm | Ca kiểm thử sau khi được phép chạy app/API với dữ liệu thử | Kết quả cần lưu làm bằng chứng |
|---|---|---|
| Scope1 | Search khu vực có/không kết quả, từ khóa có dấu/khoảng trắng; cuộn page2 rồi X | API thật lọc đúng field; text/q cleared, page1/full list đúng, không response cũ ghi đè |
| Scope2/6 | Creator hợp lệ, required fail, giá âm/chuỗi, API400/403/quota/timeout nếu áp dụng | Message rõ; request đúng DTO; không double submit; ID/status owner đúng |
| Persistence | Tạo record test được phép → mine/detail → đóng/mở app | Record còn ở server/DB; ảnh/contact/address đọc đúng, không chỉ cache local |
| Scope3 | 0/1/nhiều ảnh, portrait/landscape/cực cao, URL sai, mạng chậm, đổi listing | Cover đúng, counter/swipe không vượt, không méo, placeholder/error/loading hợp lý; mượt được quan sát thật |
| Scope4 | Guest/User/Landlord/Admin; currentPlan/flag/expiry theo contract | UI đúng policy; API trực tiếp không quyền bị từ chối; không dựa chỉ ẩn nút |
| Scope5 | Account A/B, mine nhiều trang/rỗng/error/refresh, chính sách hết quota | Chỉ đúng owner, paging không lặp, không dữ liệu cũ, quản lý tin cũ theo policy |
| Mobile UI | Android màn nhỏ, keyboard open/close, Back, system bars, focus/retry | Field/nút không bị che, Back có hành vi thống nhất, error recover đúng |
| Conditional moderation | Chỉ nếu đã có workflow ở web/mobile backend | Pending/rejected không public nếu policy yêu cầu; approved+available được hiển thị, status phòng/moderation không lẫn |

Chưa thực hiện các ca mutation/role/direct-call này. Bằng chứng cần lấy từ account test và backend được phép, không thử sửa/xóa dữ liệu người khác hoặc tạo giao dịch thật trong audit read-only.

## X. Final Assessment

1. **Sáu đầu việc của Tiến Dũng đến đâu?** Cả6 có phần implementation; UI mine/create và cơ chế ảnh cơ bản đã có. Scope1 thiếu nút X; scope4 chưa đúng/đủ gate; scope2 chưa chứng minh tạo/persist. Không kết luận đã hoàn thành chỉ vì có JSX/POST wrapper.
2. **Toàn module hoàn thiện khoảng bao nhiêu?** Chưa đủ căn cứ đưa % tổng có ý nghĩa: chưa có scope mở rộng chốt, trọng số, backend contract hoặc runtime. Tỷ lệ 4/8 wrapper có caller và 3/3 cơ chế ảnh có code chỉ là số liệu source, không phải tỷ lệ sản phẩm hoàn thành.
3. **Chức năng nào chỉ có UI nhưng chưa hoạt động?** Form Đăng tin có handler API thật, mine có GET thật, không gọi là UI mock. Tuy nhiên hoạt động E2E chưa kiểm chứng. Gate/banner hiện có nhưng logic quyền có vấn đề. Filters/sort/owner CRUD không có UI, nên không mô tả là button giả không handler.
4. **Thiếu backend/API/database ở đâu?** Thiếu **source/bằng chứng** backend trong phạm vi audit, chưa biết server thiếu implementation nào. FE đã khai báo 8 endpoint accommodation, mới dùng 4; upload/admin wrappers chưa nối. Không xác minh được DB engine/schema/persistence; không kết luận phải xây backend mới.
5. **Phân quyền đúng và đủ chưa?** **Chưa.** UI heuristic thiếu field/policy đã thể hiện ở các màn khác và mô hình dự kiến; test hàm chứng minh các trường hợp chặn/mở UI sai. Auth/ownership/direct API/quota/privacy server vẫn CX, chưa thể xác nhận an toàn hoặc lỗ hổng khai thác.
6. **Sai nghiệp vụ hoặc nguy cơ crash?** Sai/thiếu rõ nhất là clear search và quyền UI. Contract address/contact/mine, stale error/data, unguarded listing/owner/images có thể làm lệch dữ liệu hoặc crash khi response không đúng shape; các crash chưa được tái hiện. Ảnh kích thước lớn và keyboard là nguy cơ UX/performance, không phải crash đã chứng minh.
7. **P0/P1 cần ngay?** Chưa có P0 xác nhận. Ưu tiên ACC-01 clear, ACC-02 quyền, ACC-03 verify create contract/persistence và ACC-04 checks dùng chung; feedback ACC-06 cũng cần để demo flow đăng tin đáng tin cậy.
8. **Phần nào vượt scope/không cần thiết MMA301?** Không mặc định TS/Router/hooks/API/upload sai. Advanced filters/sort, quota/8 ảnh/views/resubmit/admin mobile/owner CRUD chưa thuộc 6 việc nếu chưa xác nhận. Không cần đổi kiến trúc thành enterprise hay bổ sung DB/framework mới cho audit này.
9. **Đủ điều kiện demo chưa?** Có cơ sở trình bày source và khung UI; **chưa đủ bằng chứng xác nhận demo đầy đủ 6 đầu việc/E2E**. Cần sửa thiếu sót tường minh, chốt quyền/contract, chạy app/APK và acceptance tests.
10. **Thứ tự tối ưu?** Chốt contract → sửa quyền + X (có thể song song) → form/feedback/persistence → mine/session/pagination → ảnh/detail/mobile QA → phần mở rộng có scope → cleanup. Sửa shared lint/typecheck song song đúng người phụ trách; không dừng audit vì backend chưa có source.

### Nguồn và phần chưa kiểm tra được

Đã đọc source/module/dependency được liệt kê tại mục II và rà caller toàn `src`; không có file liên quan nào trong workspace bị bỏ qua do lỗi đọc. Không đọc toàn node_modules/cache/.git/build artifacts; chỉ đọc dependency/config có mục đích. Chưa QA hình ảnh/UI bằng screenshot, chưa đo hiệu năng và chưa build/install APK.

Chưa có source controller/service/schema/DB/auth middleware backend, API docs, account test/rubric, kết quả API public đọc được hoặc bằng chứng quy trình moderation. Công cụ web thử public list/meta không đọc được response; GitHub discovery chưa xác minh được repo backend. Những khoảng trống này đã được giữ ở trạng thái chưa xác minh thay vì điền bằng suy đoán.

Tài liệu tham khảo kỹ thuật đã dùng: [Expo SDK58](https://docs.expo.dev/versions/v58.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [RN Image](https://reactnative.dev/docs/image), [RN FlatList](https://reactnative.dev/docs/flatlist), và tài liệu Router/SecureStore/ImagePicker đã đối chiếu trong audit toàn project. Đây là tài liệu công nghệ, **không phải syllabus MMA301**. Tiêu chí bắt buộc trong báo cáo module trước hết dựa trên 6 đầu việc người dùng vừa cung cấp.

### Cập nhật triển khai — 30/10/2026

Theo yêu cầu sửa code sau audit, đã triển khai phần mobile của Dũng dưới đây. **Giữ nguyên predicate và các điều kiện phân quyền hiện có**, chưa xử lý ACC-02/EXT-05 hoặc thay đổi chính sách role/plan/quota. Nếu gate hiện tại chặn tài khoản, đó vẫn là phần phải giải quyết cùng backend sau.

| Đầu việc | Thay đổi đã thực hiện | Giới hạn còn lại |
|---|---|---|
| 1. Search và X | Thêm nút Tìm/X, clear cả text/q, tự bỏ query khi xóa hết chữ; hook reset trang theo query | Vẫn dùng q của API hiện có; chưa xác nhận server tìm address/khu vực với dữ liệu thật |
| 2. Đăng bài | Tách form, validate title/address và giá, chống gửi trùng, lỗi rõ và giữ input; success chuyển mine và tải lại | Giữ đúng payload 5 trường hiện có, giá trống→0; chưa có authenticated POST/DB test và không tự đoán DTO backend |
| 3. Ảnh | Card phòng 210px, Gallery 180–320px; contain, loading/error/retry/no-image, paging/counter reset theo bộ ảnh/kích thước | Chưa thử swipe/performance bằng Android thật; PassCard giữ layout cũ |
| 4. Phân quyền | **Tạm hoãn theo yêu cầu**; predicate trước/sau có SHA256 khớp nhau | Không bypass hoặc công bố đã sửa quyền; backend/ownership/quota vẫn chưa xác minh |
| 5. Tin của tôi | Header, empty/retry/loading/refresh/footer; status phòng và moderation tách riêng nếu API trả; session reset; mine gửi page/limit | Không thêm owner CRUD/moderation UI ngoài scope; schema/status server chưa xác minh |
| 6. Giao diện Đăng tin | Required labels, lỗi từng field/API, disabled/sending, keyboard/safe-area; Back Android từ segment về Tìm phòng | Không tự thêm trường/image limit hoặc upload chưa được contract xác nhận |

Sửa hỗ trợ: hook phân trang serialize request và bỏ response/error/finally cũ; không fetch list sau form/banner; giữ items khi refresh lỗi và hiện message; normalize array/envelope/pagination, dedup id/_id/userId; từ chối response trả sai trang để tránh tải lặp. Detail có retry/shape guard, address string/object, chi phí bằng 0, khóa favorite và catch mở dialer. Shared KeyboardScreen dùng ViewInstance phù hợp RN 0.88.

File chính: [screen](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx>), [form](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/accommodation/CreateAccommodationForm.tsx>), [validation](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/accommodation-form.ts>), [card](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/cards.tsx>), [ảnh](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/listing-image.tsx>), [Gallery/UI](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/components/ui.tsx>), [detail](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/accommodation/[id].tsx>), [pagination](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/use-infinite-list.ts>), [list helpers](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/hooks/infinite-list-utils.ts>), [API mine](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/api/accommodations.js>).

| Kiểm tra sau sửa | Kết quả |
|---|---|
| Node tests | **24/24 đạt**: validation/payload, production handlers submit/X, chống trùng/retry/unmount/success→mine, normalize/dedup/request concurrency/sai trang |
| ESLint các file sửa/thêm và tests | **Đạt**; không warning/error trong phạm vi này |
| Export bundle Android | **Đạt**, Metro/Hermes 1.436 modules; không phải APK build/install |
| Lint toàn project | Còn **15 errors/3 warnings cũ**, nằm ngoài các file vừa sửa; chưa đạt toàn repo |
| Typecheck toàn project | Còn **9 diagnostics cũ** ở tabs layout, starter tabs/web và use-theme; không có diagnostic trong các file sửa/thêm |
| Thiết bị/backend | Không có thiết bị ADB kết nối, chưa chạy APK; không gọi API tạo/sửa/xóa thật hoặc kiểm chứng DB persistence |

Chạy kiểm tra logic không cần cài test framework:

```text
node --test scripts/accommodation.test.cjs scripts/infinite-list.test.cjs
```

[Tests form/search](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/scripts/accommodation.test.cjs>) chạy helper thật và callback lấy từ source bằng TypeScript AST với API/setter giả lập; [tests list](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/scripts/infinite-list.test.cjs>) kiểm tra normalization và request coordinator. Đây là kiểm tra behavior cô lập, không thay thế React rendering, UI Android hay end-to-end server/database. Không cài/nâng cấp dependency; các thay đổi có sẵn của người dùng trong manifest/lockfile/entry/login được giữ nguyên.

### Cập nhật tiếp theo — hoàn tất phân quyền frontend, 30/10/2026

Người dùng đã cho phép xử lý tiếp phần phân quyền của Dũng nếu không cần sửa backend. Bản cập nhật này **thay thế trạng thái “tạm hoãn phân quyền” ở lần triển khai trước**. Không sửa source backend, endpoint hay cơ chế cấp gói trên máy chủ; không gán quyền vào tài khoản tại frontend.

#### 1. Những gì đã sửa

- Bỏ heuristic `checkIsVip` và việc dò nhiều tên trường/substring. Dùng đúng `user.currentPlan` và `user.isLandlord`, phù hợp các màn tài khoản/gói dịch vụ hiện có và thông tin người dùng cung cấp. Chưa quan sát response của tài khoản thật để xác nhận backend triển khai mọi trường hợp.
- Mở form tạo tin khi đã đăng nhập, `isLandlord === true`, `currentPlan` là `plus` hoặc `pro`. Chuẩn hóa khoảng trắng/chữ hoa của chuỗi gói; không coi chuỗi `"true"` là boolean và không tự cấp quyền theo `role: "admin"`.
- Tách quyền xem bài cũ với quyền tạo bài mới: Tin của tôi yêu cầu đăng nhập và gọi `/accommodations/mine`. Người dùng đổi về Basic vẫn truy cập danh sách để nhận kết quả/giới hạn thực tế từ API. Server vẫn phải xác thực và lọc đúng chủ sở hữu; đây không phải bằng chứng API đã phân quyền an toàn.
- Guest thấy lời nhắc đăng nhập; trong lúc khởi tạo session hiển thị loading. Thiếu quyền chủ trọ và thiếu gói trả phí có thông báo/đường dẫn khác nhau. Nút tạo tin ở header Tin của tôi chỉ hiện khi đủ điều kiện.
- Thêm `refreshSession()` dùng `/auth/me` hiện có, cập nhật user/profile từ phản hồi server. Tự tải lại khi vào phần riêng tư/quay về từ màn tài khoản; có nút kiểm tra lại quyền dùng `{ force: true }`. Refresh không làm mất form chỉ vì chuyển loading của phiên.
- Chặn phản hồi phiên cũ sau logout/đổi tài khoản/unmount; gộp các refresh đang chạy và cho phép yêu cầu GET mới sau mutation. Tuần tự hóa ghi/xóa token để cleanup cũ không xóa token mới. DELETE đã hợp lệ khi enqueue vẫn hoàn tất trước SET mới, kể cả lần login mới thất bại.
- Màn Gói dịch vụ giữ nguyên POST `/subscriptions/subscribe` và payload `{ plan }`. Lỗi POST không còn báo thành công; khóa gửi lặp, bỏ kết quả của tài khoản cũ và tải lại session sau request được tiếp nhận. Không tự đổi `currentPlan`, không khẳng định request đã kích hoạt gói/thanh toán thành công.
- Lỗi tạo tin 401/403 giữ message hợp lệ của API hoặc hiện lời nhắc rõ ràng. Không tự suy ra quota, ngày hết hạn hoặc trạng thái duyệt từ một mã lỗi chung.

| Tài khoản phía FE | Tin của tôi | Form Đăng tin |
|---|---|---|
| Guest | Nhắc đăng nhập, không gọi mine | Nhắc đăng nhập |
| Đã đăng nhập, thiếu quyền chủ trọ | Gọi API mine của phiên hiện tại | Thông báo thiếu quyền chủ trọ |
| Chủ trọ, Basic/không có gói hợp lệ | Gọi API mine của phiên hiện tại | Thông báo cần Plus/Pro |
| Chủ trọ, Plus/Pro | Gọi API mine của phiên hiện tại | Hiển thị form; API quyết định tạo tin cuối cùng |
| Admin | Không có đường tắt vượt điều kiện trên | Role admin một mình không tự cấp quyền tạo tin |

File quyền: [helper](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/accommodation-permissions.ts>), [screen](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/(tabs)/index.tsx>), [AuthContext](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/auth/AuthContext.js>), [subscription](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/app/account/subscription.tsx>), [thông báo lỗi](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/src/utils/accommodation-form.ts>).

#### 2. Trạng thái sáu đầu việc sau hai lần triển khai

| STT | Đầu việc Dũng | Phần frontend hiện có | Điều kiện còn cần xác minh |
|---|---|---|---|
| 1 | Tìm khu vực + X | Query q, nút Tìm/X, reset text/query/trang và xử lý response cũ | Server có thực sự tìm theo địa chỉ/khu vực với dữ liệu thật |
| 2 | Đăng bài cho thuê | Form, validation, POST, khóa gửi lặp, lỗi/success, chuyển mine và refresh | Contract POST thực tế; tạo đúng owner, dữ liệu lưu DB và đọc lại sau mở app |
| 3 | Kích thước ảnh + vuốt | Card cố định, gallery có paging/counter, loading/no-image/error/retry | Swipe/layout/performance trên thiết bị Android |
| 4 | Phân quyền Mine/Create | Đã sửa điều kiện theo field chuẩn, login/loading, tách đọc/tạo và refresh quyền | Authorization/ownership tại API; quota/expiry chỉ khi server áp dụng |
| 5 | Giao diện Tin của tôi | Header/list/trạng thái trả về/loading/error/empty/refresh/paging | Response mine/paging thực tế và chỉ chứa đúng bài của tài khoản |
| 6 | Giao diện Đăng tin | Form mobile có validation/keyboard/inset/sending/error | Required fields và DTO theo server; thao tác bàn phím trên thiết bị |

Các phần FE xác định được trong sáu đầu việc đã có implementation. **Không quy đổi thành 100% hoặc xác nhận hoàn thành E2E**, vì chưa có bằng chứng từ server/DB/thiết bị thật. Không thêm owner CRUD, advanced filters, upload ảnh/8 ảnh hay quy trình admin chỉ để mở rộng phạm vi khi chưa chốt contract và phân công.

#### 3. Kiểm tra cuối cùng

| Kiểm tra | Kết quả mới nhất |
|---|---|
| Node behavior tests | **55/55 đạt**, không gọi API thật |
| Phân bổ tests | 14 form/search/errors; 11 list/concurrency; 10 quyền; 13 auth/session; 7 request gói dịch vụ |
| ESLint toàn bộ file sửa/thêm và tests | **Đạt**, exit 0, không warning/error |
| Android bundle export | **Đạt**, Metro/Hermes **1.437 modules**, bundle 3,6 MB; không phải build/cài APK |
| Lint toàn repo | **Chưa đạt**: 15 errors/1 warning cũ ngoài các file sửa, gồm profile/edit, alias starter components/theme/hooks, NotificationContext và use-color-scheme.web; warning axios |
| Typecheck toàn repo | **Chưa đạt**: 9 diagnostics cũ ở `(tabs)/_layout.tsx`, `app-tabs.tsx`, `app-tabs.web.tsx`, `use-theme.ts`; không có diagnostic trong phần sửa |
| Whitespace | `git diff --check` exit 0 |
| Package/config | Không cài/nâng package; giữ nguyên các thay đổi người dùng đã có ở package/lockfile/entry/login |
| Runtime/BE/DB | Chưa đăng nhập tài khoản thật, chưa tạo bài/giao dịch thật, chưa chứng minh persistence hoặc chạy APK trên thiết bị |

```text
node --test scripts/accommodation.test.cjs scripts/infinite-list.test.cjs scripts/accommodation-permissions.test.cjs scripts/auth-session.test.cjs scripts/subscription.test.cjs
```

[Tests quyền](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/scripts/accommodation-permissions.test.cjs>) chạy helper thật; [tests session](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/scripts/auth-session.test.cjs>) chạy provider thật với hooks/SecureStore/HTTP giả lập; [tests gói](<C:/Ki 7 SE (FALL)/MMA301/Roomie-Mobile/scripts/subscription.test.cjs>) chạy callback thật với Alert/HTTP/session giả lập. Đây là kiểm thử behavior cô lập, không thay thế render React, native storage hay E2E.

#### 4. Khi nào thực sự cần làm việc với BE?

**Lỗi dùng sai tên trường quyền vừa sửa không yêu cầu đổi BE.** Nếu `/auth/me` trả đúng `currentPlan` và `isLandlord` như thông tin người dùng cung cấp, FE hiện đã đọc đúng hai trường đó.

| Nội dung còn lại | Cần làm gì với BE? |
|---|---|
| Search q có lọc địa chỉ/khu vực | Kiểm thử contract/data; nếu server không lọc field này mới cần sửa query backend hoặc dùng tham số chính thức được backend hỗ trợ |
| POST tạo tin/mine/detail | Đối chiếu DTO, shape response, mapping address/contact và required fields; chưa có bằng chứng backend đang lỗi, không đổi payload theo phỏng đoán |
| Owner, quyền tạo tin, gói/quota/expiry | Kiểm tra middleware/controller bằng source hoặc account test. Nếu API thiếu kiểm tra thì phải sửa BE; frontend không thể thay thế bước này |
| Review/public visibility/status | Xác nhận enum và rule server thực tế trước khi thêm/chỉnh workflow, không tự áp quy trình duyệt |
| Đăng ký/thanh toán gói | Xác nhận `/subscriptions/subscribe` và luồng billing/activation hiện có; không đổi sang endpoint khác hoặc công bố gói đã được kích hoạt chỉ từ HTTP success |
| Ảnh upload và giới hạn ảnh | Cần contract upload/create cùng xác nhận thuộc scope trước khi nối form; chưa kết luận server thiếu endpoint hoặc phải làm 8 ảnh |

Thứ tự xác minh tiếp: dùng tài khoản chủ trọ Plus/Pro có sẵn → kiểm tra form mở đúng → tạo tin thử được phép → mine/detail và mở lại app → search khu vực/X → swipe/keyboard/Back Android → đối chiếu API từ chối quyền/quota theo policy thực tế. Hiện không có căn cứ tuyên bố backend hoàn toàn đúng, hoàn toàn sai hoặc bắt buộc phải viết lại backend.
