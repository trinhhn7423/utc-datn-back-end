# HƯỚNG DẪN TÍCH HỢP API MOBILE APP
## CHỨC NĂNG ĐÁNH GIÁ (REVIEWS) - CLIENT USER

Tài liệu này hướng dẫn lập trình viên phát triển Mobile App tích hợp các API liên quan đến **Đánh giá sản phẩm (Reviews)** cho phía khách hàng (User client).

---

## 1. Yêu Cầu Xác Thực (Authentication)

Các API liên quan đến Đánh giá sản phẩm yêu cầu quyền truy cập của vai trò `USER` với Header `Authorization: Bearer <JWT_TOKEN>` đi kèm:
```http
Authorization: Bearer <JWT_TOKEN>
```
*   **Base URL**: `/reviews`

---

## 2. Danh Sách Các Endpoints API

### 2.1. Lấy Danh Sách Sản Phẩm Cần Đánh Giá (Mới Thêm)
Dùng để hiển thị danh sách các sản phẩm mà người dùng đã mua thành công nhưng **chưa thực hiện đánh giá**. Thường dùng cho tab **"Chờ đánh giá"** trong trang quản lý đơn hàng/đánh giá cá nhân.

*   **Endpoint**: `/reviews/unreviewed`
*   **Method**: `GET`
*   **Response**: `BaseResponse<UnreviewedItemResponseDto[]>`

#### Ví dụ Response:
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách sản phẩm cần đánh giá thành công",
  "data": [
    {
      "orderId": "0fa5b2bc-02b4-47b2-bdcf-88ff206d9d47", // ID của đơn hàng đã mua
      "productId": "8a93e3d9-5f21-4f11-9bc2-3c1a2d3e4f5a", // ID của sản phẩm
      "productName": "Áo Thun Cotton Basic",
      "productThumbnail": "https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-1.jpg",
      "color": "Black",
      "size": "L",
      "priceAtPurchase": 199000,                            // Giá mua lúc đó
      "quantity": 1,                                        // Số lượng mua
      "orderCreatedAt": "2026-05-22T13:24:24.000Z"          // Ngày đặt hàng
    }
  ]
}
```

---

### 2.2. Tạo Đánh Giá Mới Cho Sản Phẩm
Dùng khi người dùng bấm vào một sản phẩm trong danh sách chưa đánh giá, điền số sao và nội dung bình luận, sau đó bấm nút **"Gửi đánh giá"**.

*   **Endpoint**: `/reviews`
*   **Method**: `POST`
*   **Request Body**: `CreateReviewDto`
    ```json
    {
      "orderId": "0fa5b2bc-02b4-47b2-bdcf-88ff206d9d47", // Lấy từ danh sách unreviewed (bắt buộc)
      "productId": "8a93e3d9-5f21-4f11-9bc2-3c1a2d3e4f5a", // Lấy từ danh sách unreviewed (bắt buộc)
      "rating": 5,                                         // Số sao từ 1 đến 5 (bắt buộc)
      "comment": "Chất vải đẹp, mặc rất mát và vừa vặn!"    // Bình luận (tùy chọn)
    }
    ```
*   **Response**: `ReviewResponseDto` (Chi tiết đánh giá vừa tạo)
    ```json
    {
      "id": "7bf3f345-6677-4402-9988-5c6c7d8e9f0a",
      "rating": 5,
      "comment": "Chất vải đẹp, mặc rất mát và vừa vặn!",
      "userId": "user-uuid-string",
      "productId": "8a93e3d9-5f21-4f11-9bc2-3c1a2d3e4f5a",
      "orderId": "0fa5b2bc-02b4-47b2-bdcf-88ff206d9d47",
      "createdAt": "2026-05-22T16:15:00.000Z"
    }
    ```
*   **Các lỗi nghiệp vụ thường gặp (HTTP 400)**:
    *   `Đơn hàng không tồn tại hoặc không thuộc về người dùng này`.
    *   `Chỉ có thể đánh giá khi đơn hàng đã được giao thành công (COMPLETED)`.
    *   `Sản phẩm này không nằm trong đơn hàng đã chọn`.
    *   `Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi` (Ngăn chặn đánh giá trùng lặp).

---

## 3. Hướng Dẫn Tích Hợp Trên Giao Diện Mobile (UI/UX Best Practices)

### 3.1. Luồng Người Dùng Đánh Giá (Review Flow)
1. **Màn hình Chờ đánh giá**: Gọi API `GET /reviews/unreviewed` để hiển thị các thẻ sản phẩm kèm thông tin chi tiết: tên, biến thể (color, size), giá tiền, ngày mua.
2. **Kích hoạt Form đánh giá**: Khi người dùng nhấn nút **"Viết đánh giá"** trên một thẻ sản phẩm:
   - Mở màn hình Bottom Sheet hoặc một Màn hình mới chứa Form đánh giá.
   - Truyền sẵn dữ liệu `orderId`, `productId`, `productName`, `productThumbnail` sang form này.
3. **Màn hình Form**:
   - Hiển thị thanh Chọn số sao (1-5 sao, mặc định nên để 5 sao).
   - Cung cấp ô nhập liệu `TextInput` đa dòng (Multiline) để viết nhận xét (Placeholder gợi ý: *"Hãy chia sẻ cảm nhận của bạn về sản phẩm này nhé..."*).
   - Khi nhấn **"Gửi đánh giá"**, thực hiện gọi API `POST /reviews`.
4. **Sau khi gửi thành công**:
   - Hiển thị Toast thông báo thành công: *"Cảm ơn bạn đã đánh giá sản phẩm!"*.
   - Đóng form và gọi lại `GET /reviews/unreviewed` để làm mới danh sách (sản phẩm vừa đánh giá sẽ tự động biến mất khỏi danh sách này).
