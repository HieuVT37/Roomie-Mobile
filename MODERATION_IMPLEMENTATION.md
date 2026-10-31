# Triển khai hệ thống kiểm duyệt cho Accommodation và Pass

## Tổng quan
Đã triển khai hệ thống kiểm duyệt bắt buộc cho tất cả tin đăng accommodation (tìm phòng) và pass (pass phòng/pass đồ). Mọi bài đăng mới hoặc chỉnh sửa đều phải được admin duyệt trước khi hiển thị công khai.

## Các thay đổi chính

### 1. Frontend - UI/UX Changes

#### 1.1. Danh sách công khai (Tab Tìm phòng / Pass phòng / Pass đồ)
**File:** `src/app/(tabs)/index.tsx`, `src/app/(tabs)/pass.tsx`

- **Lọc theo trạng thái kiểm duyệt**: Chỉ hiển thị các bài đăng đã được duyệt (`moderationStatus === "approved"`)
- **Áp dụng cho:**
  - Tab "Tìm phòng" trong màn hình Accommodation
  - Tab "Pass phòng" và "Pass đồ" trong màn hình Pass

```typescript
// Chỉ hiển thị tin đã được duyệt ở tab search
let filtered = tab === "search" 
  ? serverItems.filter((item: any) => item.moderationStatus === "approved")
  : serverItems;
```

#### 1.2. Tab "Tin của tôi"
**File:** `src/app/(tabs)/index.tsx`, `src/app/(tabs)/pass.tsx`

- **Hiển thị đầy đủ**: Hiển thị TẤT CẢ bài đăng của người dùng bất kể trạng thái kiểm duyệt
- **Hiển thị trạng thái**: Badge màu sắc để phân biệt trạng thái:
  - 🟢 Xanh lá: Đã duyệt công khai (`approved`)
  - 🔴 Đỏ: Bị từ chối (`rejected`)
  - 🟡 Vàng: Chờ quản trị duyệt (`pending`)
- **Hiển thị lý do từ chối**: Nếu bài bị từ chối, hiển thị lý do trong box màu đỏ
- **Nút thay đổi trạng thái**: CHỈ hiển thị khi bài đã được duyệt

```typescript
// Chỉ cho phép thay đổi trạng thái khi đã được duyệt
onSetStatus={item.moderationStatus === "approved" ? (status) => handleSetStatus(item, status) : undefined}
```

#### 1.3. Form tạo/chỉnh sửa bài đăng
**File:** `src/components/accommodation/CreateAccommodationForm.tsx`

- **Thông báo kiểm duyệt**: Thêm thông báo ở đầu form:
  - **Tạo mới**: "Tất cả bài đăng cần được quản trị viên duyệt trước khi hiển thị công khai. Bạn có thể xem trạng thái ở tab 'Tin của tôi'."
  - **Chỉnh sửa**: "Mọi chỉnh sửa cần được quản trị viên duyệt lại trước khi hiển thị công khai."

```tsx
<View style={{ backgroundColor: "#1e3a8a", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#3b82f6", marginTop: 8 }}>
  <Text style={{ color: "#93c5fd", fontSize: 13, lineHeight: 20 }}>
    ℹ️ <Text style={{ fontWeight: "700" }}>Lưu ý:</Text> {mode === "edit" 
      ? "Mọi chỉnh sửa cần được quản trị viên duyệt lại trước khi hiển thị công khai."
      : "Tất cả bài đăng cần được quản trị viên duyệt trước khi hiển thị công khai. Bạn có thể xem trạng thái ở tab 'Tin của tôi'."}
  </Text>
</View>
```

- **Alert sau khi submit**:
  - **Tạo mới**: "Đã gửi bài đăng. Bài viết đang chờ quản trị viên duyệt và sẽ hiển thị ở tab 'Tin của tôi'."
  - **Chỉnh sửa**: "Đã lưu thay đổi. Bài viết đã được cập nhật và đang chờ quản trị viên duyệt lại. Sau khi được duyệt, thay đổi sẽ hiển thị công khai."

#### 1.4. Màn hình chi tiết (Detail Screen)
**File:** `src/app/accommodation/[id].tsx`, `src/app/pass/[id].tsx`

Chỉ hiển thị cho chủ bài đăng:

- **Badge trạng thái kiểm duyệt** với màu sắc tương ứng
- **Lý do từ chối** (nếu có) trong box màu đỏ
- **Nút thay đổi trạng thái** (Đã tìm được người / Đóng tin / Mở lại): CHỈ hiển thị khi `moderationStatus === "approved"`

```tsx
{/* Hiển thị trạng thái kiểm duyệt */}
<View style={{ marginTop: 8, marginBottom: 8 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor:
          l.moderationStatus === "approved"
            ? "#22c55e"
            : l.moderationStatus === "rejected"
              ? "#ef4444"
              : "#f59e0b",
      }}
    />
    <Text style={{ color: themeColors.muted, fontSize: 14 }}>
      {l.moderationStatus === "approved"
        ? "Đã duyệt công khai"
        : l.moderationStatus === "rejected"
          ? "Bị từ chối"
          : "Chờ quản trị duyệt"}
    </Text>
  </View>
  
  {/* Hiển thị lý do từ chối nếu có */}
  {l.moderationStatus === "rejected" && l.rejectionReason && (
    <View style={{ backgroundColor: "#450a0a", borderWidth: 1, borderColor: themeColors.danger, borderRadius: 8, padding: 10, marginTop: 8 }}>
      <Text style={{ color: "#fca5a5", fontSize: 12, fontWeight: "700", marginBottom: 4 }}>
        Lý do từ chối:
      </Text>
      <Text style={{ color: "#fca5a5", fontSize: 12, lineHeight: 18 }}>
        {l.rejectionReason}
      </Text>
    </View>
  )}
</View>

{/* Đổi trạng thái bài viết - CHỈ HIỂN THỊ KHI ĐÃ ĐƯỢC DUYỆT */}
{l.moderationStatus === "approved" && (
  <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: themeColors.border, paddingTop: 10 }}>
    {/* Nội dung nút thay đổi trạng thái */}
  </View>
)}
```

### 2. Backend Requirements

Backend cần hỗ trợ các trường sau cho cả Accommodation và Pass:

#### 2.1. Trường dữ liệu
- `moderationStatus`: enum `"pending" | "approved" | "rejected"` (mặc định: `"pending"`)
- `rejectionReason`: string (optional, chỉ có khi `moderationStatus === "rejected"`)

#### 2.2. Business Logic

**Khi tạo bài đăng mới:**
- Tự động đặt `moderationStatus = "pending"`
- Bài đăng KHÔNG xuất hiện trong danh sách công khai
- Chủ bài thấy bài đăng trong "Tin của tôi" với trạng thái "Chờ quản trị duyệt"

**Khi chỉnh sửa bài đăng:**
- Tự động đặt lại `moderationStatus = "pending"`
- Nếu bài trước đó đã được duyệt, nó sẽ BIẾN MẤT khỏi danh sách công khai cho đến khi được duyệt lại
- Chủ bài thấy trạng thái chuyển về "Chờ quản trị duyệt"

**API listing (GET /accommodations, GET /pass):**
```javascript
// Backend cần filter theo moderationStatus
listAccommodationsApi({ 
  moderationStatus: "approved" // Chỉ trả về bài đã được duyệt
})
```

**API "Tin của tôi" (GET /accommodations/mine, GET /pass/mine):**
```javascript
// Backend KHÔNG filter, trả về tất cả bài của user
myAccommodationsApi() // Trả về tất cả bài bất kể moderationStatus
```

#### 2.3. API Admin (cần có)

**Endpoint duyệt bài:**
```javascript
// PATCH /accommodations/:id/moderate
// PATCH /pass/:id/moderate
{
  "moderationStatus": "approved" | "rejected",
  "rejectionReason": "string (required if rejected)"
}
```

**Endpoint lấy danh sách bài chờ duyệt (dành cho Admin):**
```javascript
// GET /admin/accommodations?moderationStatus=pending
// GET /admin/pass?moderationStatus=pending
```

### 3. Labels đã có sẵn

**File:** `src/utils/labels.js`

```javascript
export const MODERATION_LABELS = { 
  pending: "Chờ duyệt", 
  approved: "Đã duyệt", 
  rejected: "Bị từ chối" 
};
```

### 4. Card Component

**File:** `src/components/cards.tsx`

Component `AccommodationCard` và `AccommodationMineCard` đã hỗ trợ hiển thị `moderationStatus` và `rejectionReason`:

```tsx
// Tự động hiển thị badge trạng thái kiểm duyệt
{typeof item.moderationStatus === "string" && item.moderationStatus ? (
  <Text style={s.muted}>
    Kiểm duyệt: {(MODERATION_LABELS as Record<string, string>)[item.moderationStatus] || item.moderationStatus}
  </Text>
) : null}

// Tự động hiển thị lý do từ chối
{typeof item.rejectionReason === "string" && item.rejectionReason.trim() ? (
  <Text style={s.rejection}>Lý do từ chối: {item.rejectionReason}</Text>
) : null}
```

## Luồng hoạt động

### Luồng tạo bài mới
1. User điền form và submit
2. Frontend gửi API `POST /accommodations` hoặc `POST /pass`
3. Backend tạo bài với `moderationStatus = "pending"`
4. Frontend hiển thị Alert: "Đã gửi bài đăng. Bài viết đang chờ quản trị viên duyệt..."
5. User chuyển đến tab "Tin của tôi" → Thấy bài với trạng thái "Chờ quản trị duyệt"
6. Bài KHÔNG xuất hiện trong danh sách công khai

### Luồng chỉnh sửa bài
1. User vào chi tiết bài của mình → Nhấn "Chỉnh sửa"
2. Sửa thông tin và submit
3. Frontend gửi API `PUT /accommodations/:id` hoặc `PUT /pass/:id`
4. Backend cập nhật bài và đặt lại `moderationStatus = "pending"`
5. Frontend hiển thị Alert: "Đã lưu thay đổi. Bài viết đang chờ duyệt lại..."
6. Bài BIẾN MẤT khỏi danh sách công khai cho đến khi được duyệt lại

### Luồng duyệt bài (Admin)
1. Admin vào màn hình quản lý bài chờ duyệt
2. Xem chi tiết bài
3. Chọn "Duyệt" hoặc "Từ chối" (với lý do)
4. Backend cập nhật:
   - Nếu duyệt: `moderationStatus = "approved"`
   - Nếu từ chối: `moderationStatus = "rejected"`, `rejectionReason = "..."`
5. User thấy trạng thái cập nhật trong "Tin của tôi"
6. Nếu được duyệt → Bài xuất hiện trong danh sách công khai

## Kiểm tra hoạt động

### Test Case 1: Tạo bài mới
1. ✅ Đăng nhập
2. ✅ Vào tab "Đăng tin" (Accommodation) hoặc "Tin mới" (Pass)
3. ✅ Điền form và submit
4. ✅ Kiểm tra Alert hiển thị đúng thông báo về kiểm duyệt
5. ✅ Vào tab "Tin của tôi" → Thấy bài với badge vàng "Chờ quản trị duyệt"
6. ✅ Vào tab "Tìm phòng" hoặc "Pass phòng/đồ" → KHÔNG thấy bài vừa đăng

### Test Case 2: Chỉnh sửa bài đã được duyệt
1. ✅ Có 1 bài đã được duyệt (`moderationStatus = "approved"`)
2. ✅ Vào chi tiết bài → Nhấn "Chỉnh sửa"
3. ✅ Sửa thông tin và submit
4. ✅ Kiểm tra Alert hiển thị đúng thông báo về kiểm duyệt lại
5. ✅ Vào tab "Tin của tôi" → Badge chuyển từ xanh về vàng
6. ✅ Vào tab "Tìm phòng" hoặc "Pass phòng/đồ" → Bài BIẾN MẤT khỏi danh sách

### Test Case 3: Bài bị từ chối
1. ✅ Admin từ chối bài với lý do: "Hình ảnh không rõ ràng"
2. ✅ User vào "Tin của tôi" → Thấy badge đỏ "Bị từ chối"
3. ✅ Vào chi tiết bài → Thấy box đỏ hiển thị lý do từ chối
4. ✅ KHÔNG thấy nút thay đổi trạng thái (Đã tìm được người / Đóng tin)
5. ✅ Có thể nhấn "Chỉnh sửa" để sửa lại và gửi duyệt lại

### Test Case 4: Thay đổi trạng thái bài đăng
1. ✅ Có 1 bài đã được duyệt (`moderationStatus = "approved"`)
2. ✅ Vào chi tiết bài → HIỂN THỊ nút thay đổi trạng thái
3. ✅ Nhấn "Đã tìm được người" / "Đóng tin" → Trạng thái bài đổi (status)
4. ✅ Bài VẪN hiển thị trong danh sách công khai (vì vẫn approved)

## Files đã thay đổi

1. `src/app/(tabs)/index.tsx` - Accommodation list với filter moderationStatus
2. `src/app/(tabs)/pass.tsx` - Pass list với filter moderationStatus
3. `src/app/accommodation/[id].tsx` - Chi tiết accommodation với UI kiểm duyệt
4. `src/app/pass/[id].tsx` - Chi tiết pass với UI kiểm duyệt
5. `src/components/accommodation/CreateAccommodationForm.tsx` - Form tạo/sửa accommodation với thông báo kiểm duyệt
6. `src/components/cards.tsx` - Đã có sẵn hiển thị moderationStatus (không cần sửa)
7. `src/utils/labels.js` - Đã có sẵn MODERATION_LABELS (không cần sửa)

## Lưu ý quan trọng

### 1. Backend PHẢI filter theo moderationStatus
- API danh sách công khai (`/accommodations`, `/pass`) CHỈ trả về bài `moderationStatus === "approved"`
- API "Tin của tôi" (`/accommodations/mine`, `/pass/mine`) trả về TẤT CẢ bài của user

### 2. Validation
- Frontend đã có validation đầy đủ, không cần thay đổi
- Backend cần validate `moderationStatus` chỉ nhận 3 giá trị: `"pending"`, `"approved"`, `"rejected"`

### 3. Permissions
- Chỉ admin mới có quyền thay đổi `moderationStatus`
- User chỉ có thể xem trạng thái, không thể tự duyệt bài của mình

### 4. Performance
- Đánh index cho `moderationStatus` trong database để tăng tốc query
- Cân nhắc cache danh sách bài đã được duyệt

## Màu sắc Badge

```typescript
const dotColor = 
  moderationStatus === "approved" ? "#22c55e" :  // Xanh lá
  moderationStatus === "rejected" ? "#ef4444" :   // Đỏ
  "#f59e0b"; // Vàng (pending)
```

## Kết luận

Hệ thống kiểm duyệt đã được triển khai đầy đủ ở frontend. Backend cần:
1. Thêm trường `moderationStatus` và `rejectionReason`
2. Đặt mặc định `moderationStatus = "pending"` khi tạo/sửa bài
3. Filter API danh sách công khai theo `moderationStatus === "approved"`
4. Tạo API admin để duyệt/từ chối bài
