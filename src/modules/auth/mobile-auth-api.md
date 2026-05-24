# Tài liệu API Authentication dành cho Mobile App (User)

Tài liệu này mô tả chi tiết các API phục vụ chức năng xác thực (Authentication) dành cho người dùng trên ứng dụng di động (User App).

---

## 📌 Thông tin chung
- **Base URL:** `http://<host>:<port>/api/v1`
- **Content-Type:** `application/json`
- **Xác thực (Authorization):** Sử dụng cơ chế **JWT Bearer Token** gửi kèm trong HTTP Header đối với các API yêu cầu bảo mật:
  ```http
  Authorization: Bearer <accessToken>
  ```

---

## 🔄 Cấu trúc Response chung
Hệ thống sử dụng các bộ lọc phản hồi toàn cục (`TransformInterceptor` và `HttpExceptionFilter`) để trả về dữ liệu có cấu trúc đồng nhất.

### 1. Khi gọi API thành công (Success Response Envelope)
```json
{
  "statusCode": 200, // Hoặc 201 cho POST/Created
  "message": "Thành công", // Hoặc nội dung thông báo thành công tùy chỉnh
  "data": { ... } // Dữ liệu payload thực tế (Object, Array hoặc null)
}
```

### 2. Khi gọi API thất bại (Error Response Envelope)
```json
{
  "statusCode": 400, // 401, 403, 404, 409, 500
  "message": "Nội dung lỗi chính/Đầu tiên", 
  "data": [
    "Chi tiết lỗi 1 (nếu có)",
    "Chi tiết lỗi 2 (nếu có)"
  ] // Mảng chi tiết lỗi (thường có khi validate dữ liệu) hoặc null
}
```

---

## 🚀 Danh sách API Xác thực

### 1. Đăng ký tài khoản người dùng mới (Register)
Dùng để tạo một tài khoản người dùng (`USER`) mới trong hệ thống.

- **URL:** `/auth/register`
- **Method:** `POST`
- **Xác thực:** Không yêu cầu (Public)

#### Request Body
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc / Validate |
| :--- | :--- | :--- | :--- | :--- |
| `fullName` | `string` | Có | Họ tên đầy đủ của người dùng | Không được để trống |
| `email` | `string` | Có | Địa chỉ Email của người dùng | Định dạng email hợp lệ |
| `password` | `string` | Có | Mật khẩu đăng nhập | Tối thiểu 6 ký tự |

**Ví dụ Body gửi lên:**
```json
{
  "fullName": "Nguyen Van A",
  "email": "nguyenvana@gmail.com",
  "password": "password123"
}
```

#### Response
- **201 Created (Đăng ký thành công):**
  ```json
  {
    "statusCode": 201,
    "message": "Thành công",
    "data": {
      "id": "550e8400-e29b-411d-a716-446655440000",
      "fullName": "Nguyen Van A",
      "email": "nguyenvana@gmail.com",
      "roleId": 2, // Mặc định là 2 (USER)
      "avatarUrl": null,
      "addresses": [],
      "createdAt": "2026-05-21T16:21:48.000Z"
    }
  }
  ```

- **409 Conflict (Email đã tồn tại):**
  ```json
  {
    "statusCode": 409,
    "message": "Email đã tồn tại",
    "data": null
  }
  ```

- **400 Bad Request (Lỗi validation đầu vào):**
  ```json
  {
    "statusCode": 400,
    "message": "Mật khẩu phải có ít nhất 6 ký tự",
    "data": [
      "Mật khẩu phải có ít nhất 6 ký tự"
    ]
  }
  ```

---

### 2. Đăng nhập hệ thống (Login)
Đăng nhập bằng Email và Mật khẩu để nhận cặp token (`accessToken`, `refreshToken`) phục vụ xác thực phiên làm việc.

- **URL:** `/auth/login`
- **Method:** `POST`
- **Xác thực:** Không yêu cầu (Public)

#### Request Body
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc / Validate |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | Có | Email đã đăng ký | Định dạng email hợp lệ |
| `password` | `string` | Có | Mật khẩu đăng nhập | Tối thiểu 6 ký tự |

**Ví dụ Body gửi lên:**
```json
{
  "email": "nguyenvana@gmail.com",
  "password": "password123"
}
```

#### Response
- **200 OK (Đăng nhập thành công):**
  ```json
  {
    "statusCode": 200,
    "message": "Thành công",
    "data": {
      "accessToken": "eyJhbGciOi...", // Hạn dùng 15 phút
      "refreshToken": "eyJhbGciOi...", // Hạn dùng 7 ngày
      "user": {
        "id": "550e8400-e29b-411d-a716-446655440000",
        "fullName": "Nguyen Van A",
        "email": "nguyenvana@gmail.com",
        "roleId": 2,
        "avatarUrl": "https://example.com/avatar.jpg",
        "addresses": [
          {
            "id": "1a2b3c4d...",
            "receiverName": "Nguyen Van A",
            "phoneNumber": "0987654321",
            "province": "Hà Nội",
            "district": "Cầu Giấy",
            "ward": "Dịch Vọng",
            "specificAddress": "Số 1 Cầu Giấy"
          }
        ],
        "createdAt": "2026-05-21T16:21:48.000Z"
      }
    }
  }
  ```

- **401 Unauthorized (Sai thông tin đăng nhập):**
  ```json
  {
    "statusCode": 401,
    "message": "Thông tin đăng nhập không chính xác",
    "data": null
  }
  ```

---

### 3. Làm mới Access Token (Refresh Token)
Sử dụng `refreshToken` để lấy `accessToken` mới khi `accessToken` cũ đã hết hạn. Giúp duy trì đăng nhập của người dùng mà không cần bắt họ đăng nhập lại bằng email/mật khẩu.

- **URL:** `/auth/refresh`
- **Method:** `POST`
- **Xác thực:** Không yêu cầu (Gửi refreshToken qua Body)

#### Request Body
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `refreshToken` | `string` | Có | Refresh Token hợp lệ nhận được khi Login |

**Ví dụ Body gửi lên:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

#### Response
- **200 OK (Làm mới token thành công):**
  ```json
  {
    "statusCode": 200,
    "message": "Thành công",
    "data": {
      "accessToken": "eyJhbGciOi.newAccessToken..."
    }
  }
  ```

- **401 Unauthorized (Refresh token hết hạn hoặc không hợp lệ):**
  ```json
  {
    "statusCode": 401,
    "message": "Refresh token không hợp lệ hoặc đã hết hạn",
    "data": null
  }
  ```

---

### 4. Đổi mật khẩu (Change Password)
Đổi mật khẩu cho người dùng đang đăng nhập.

- **URL:** `/auth/change-password`
- **Method:** `PATCH`
- **Xác thực:** Yêu cầu Bearer Token (`accessToken`) gửi ở Header

#### Headers yêu cầu
```http
Authorization: Bearer <accessToken>
```

#### Request Body
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc / Validate |
| :--- | :--- | :--- | :--- | :--- |
| `oldPassword` | `string` | Có | Mật khẩu cũ đang dùng | Không được để trống |
| `newPassword` | `string` | Có | Mật khẩu mới mong muốn | Tối thiểu 6 ký tự |
| `confirmPassword` | `string` | Có | Xác nhận lại mật khẩu mới | Phải trùng khớp hoàn toàn với `newPassword` |

**Ví dụ Body gửi lên:**
```json
{
  "oldPassword": "password123",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

#### Response
- **200 OK (Đổi mật khẩu thành công):**
  ```json
  {
    "statusCode": 200,
    "message": "Đổi mật khẩu thành công",
    "data": {
      "message": "Đổi mật khẩu thành công"
    }
  }
  ```

- **400 Bad Request (Mật khẩu xác nhận không khớp hoặc mật khẩu cũ sai):**
  - Trường hợp mật khẩu cũ không đúng:
    ```json
    {
      "statusCode": 400,
      "message": "Mật khẩu cũ không chính xác",
      "data": null
    }
    ```
  - Trường hợp mật khẩu xác nhận không trùng khớp:
    ```json
    {
      "statusCode": 400,
      "message": "Mật khẩu xác nhận không khớp",
      "data": null
    }
    ```

- **401 Unauthorized (Token không hợp lệ hoặc hết hạn):**
  ```json
  {
    "statusCode": 401,
    "message": "Không có quyền truy cập",
    "data": null
  }
  ```

---

## 💡 Hướng dẫn lưu ý tích hợp cho Mobile App (React Native, Flutter, v.v.)

1. **Quản lý Token (Token Storage):**
   - Lưu trữ an toàn `accessToken` và `refreshToken` dưới thiết bị di động bằng các thư viện bảo mật như `AsyncStorage` / `Expo SecureStore` (React Native) hoặc `flutter_secure_storage` (Flutter). Không lưu dưới dạng plain text thông thường để tránh rò rỉ.

2. **Xử lý Tự động Refresh Token (Auto Refresh Token Flow):**
   - Đặt hạn dùng của `accessToken` là **15 phút**, `refreshToken` là **7 ngày**.
   - Khi ứng dụng gọi một API bảo mật bất kỳ và nhận phản hồi lỗi với status code là `401 Unauthorized` (ví dụ do `accessToken` hết hạn):
     1. Tạm dừng các request khác.
     2. Gửi request `POST /auth/refresh` kèm theo `refreshToken` đang lưu.
     3. Nếu thành công: Cập nhật `accessToken` mới vào kho lưu trữ và thực hiện lại request bị lỗi ban đầu với token mới này.
     4. Nếu thất bại (trả về lỗi `401` từ API refresh): Buộc người dùng đăng xuất (Logout), xóa sạch các token đang lưu và chuyển về màn hình đăng nhập.
