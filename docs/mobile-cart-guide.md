# HƯỚNG DẪN TÍCH HỢP API MOBILE APP
## CHỨC NĂNG GIỎ HÀNG (CART) - CLIENT USER

Tài liệu này hướng dẫn lập trình viên phát triển Mobile App tích hợp các API liên quan đến **Giỏ hàng (Cart)** cho phía khách hàng (User client).

---

## 1. Yêu Cầu Xác Thực (Authentication)

Tất cả các API liên quan đến Giỏ hàng bắt buộc phải được xác thực. Mobile App **bắt buộc** phải gửi Header chứa token đăng nhập của User và tài khoản phải có vai trò là `USER`:
```http
Authorization: Bearer <JWT_TOKEN>
```
*   **Base URL**: `/cart`

---

## 2. Danh Sách Các Endpoints API

### 2.1. Thêm Sản Phẩm Vào Giỏ Hàng
Dùng khi người dùng nhấn nút **"Thêm vào giỏ hàng"** hoặc **"Mua ngay"** từ màn hình chi tiết sản phẩm.

*   **Endpoint**: `/cart/add`
*   **Method**: `POST`
*   **Request Body**: `AddToCartDto`
    ```json
    {
      "productDetailId": 12, // ID của biến thể sản phẩm (bắt buộc)
      "quantity": 2          // Số lượng thêm vào (tối thiểu là 1)
    }
    ```
*   **Response**: `BaseResponse<null>`
    ```json
    {
      "statusCode": 200,
      "message": "Thêm sản phẩm vào giỏ hàng thành công",
      "data": null
    }
    ```
*   **Các lỗi thường gặp (HTTP 400/404)**:
    *   `Sản phẩm không tồn tại`: Biến thể sản phẩm không khớp trong hệ thống.
    *   `Sản phẩm đã ngừng bán`: Sản phẩm đã bị ẩn (`isPublished = false`).
    *   `Số lượng thêm vào vượt quá tồn kho`: Số lượng bạn gửi lên cộng với số lượng đang có trong giỏ hàng vượt quá `stock` còn lại của biến thể.

---

### 2.2. Lấy Danh Sách Sản Phẩm Trong Giỏ Hàng
Dùng để hiển thị màn hình **Giỏ hàng (Cart Screen)** hoặc lấy thông tin các sản phẩm được tích chọn để chuẩn bị thanh toán.

*   **Endpoint**: `/cart`
*   **Method**: `GET`
*   **Query Parameters (Tùy chọn)**:
    *   `ids`: Chuỗi các ID của mục giỏ hàng (`CartItem`), phân tách bởi dấu phẩy `,`. Dùng khi muốn lấy danh sách chọn cụ thể để thanh toán (Ví dụ: `/cart?ids=1,3,4`). Nếu không gửi `ids`, API sẽ trả về toàn bộ giỏ hàng của user.
*   **Response**: `BaseResponse<CartResponseDto>`

#### Ví dụ Response:
```json
{
  "statusCode": 200,
  "message": "Lấy giỏ hàng thành công",
  "data": {
    "items": [
      {
        "id": 1,                     // ID của mục giỏ hàng (CartItem ID) - dùng để cập nhật hoặc xóa
        "productDetailId": 12,       // ID của biến thể sản phẩm
        "productId": "e4b6c310-9bda",// ID của sản phẩm chính
        "name": "Áo Thun Cotton Basic",
        "thumbnail": "https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-1.jpg",
        "color": "Black",
        "size": "L",
        "price": "199000.00",        // Giá của 1 sản phẩm (kiểu string)
        "stock": 45,                 // Số lượng còn lại trong kho
        "quantity": 2,               // Số lượng người dùng đã thêm vào giỏ
        "isPublished": true          // Trạng thái mở bán của sản phẩm
      }
    ],
    "cartTotal": 398000              // Tổng số tiền của các sản phẩm được chọn (số nguyên)
  }
}
```

---

### 2.3. Cập Nhật Số Lượng Sản Phẩm Trong Giỏ
Dùng khi người dùng nhấn nút tăng `+` hoặc giảm `-` số lượng sản phẩm trên giao diện giỏ hàng.

*   **Endpoint**: `/cart/update/:id`
*   **Method**: `PUT`
*   **URL Params**: `id` (number) - Đây là **ID của mục giỏ hàng (`CartItem ID`)**, lấy từ trường `id` trong danh sách ở API `GET /cart` (không phải `productDetailId`).
*   **Request Body**: `UpdateCartDto`
    ```json
    {
      "quantity": 3 // Số lượng mới mong muốn
    }
    ```
*   **Response**: `BaseResponse<null>`
    ```json
    {
      "statusCode": 200,
      "message": "Cập nhật giỏ hàng thành công",
      "data": null
    }
    ```
*   **Các lỗi thường gặp (HTTP 400)**:
    *   `Số lượng cập nhật phải lớn hơn 0`: Số lượng gửi lên phải $\ge 1$.
    *   `Sản phẩm đã ngừng bán`: Nếu sản phẩm liên kết đã bị ẩn.
    *   `Số lượng cập nhật vượt quá tồn kho`: Vượt quá số lượng sản phẩm còn lại trong kho.

---

### 2.4. Xóa Một Sản Phẩm Khỏi Giỏ Hàng
Dùng khi người dùng nhấn nút xóa (icon thùng rác) hoặc vuốt để xóa một mặt hàng khỏi giỏ hàng.

*   **Endpoint**: `/cart/remove/:id`
*   **Method**: `DELETE`
*   **URL Params**: `id` (number) - ID của mục giỏ hàng (`CartItem ID`).
*   **Response**: `BaseResponse<null>`
    ```json
    {
      "statusCode": 200,
      "message": "Xóa sản phẩm khỏi giỏ hàng thành công",
      "data": null
    }
    ```

---

### 2.5. Lấy Số Lượng Các Mặt Hàng Trong Giỏ
Dùng để hiển thị Badge đếm số lượng (Ví dụ chấm đỏ `[3]`) trên icon Giỏ hàng ở màn hình Home, thanh Tab bar.

*   **Endpoint**: `/cart/count`
*   **Method**: `GET`
*   **Response**: `BaseResponse<CartCountResponseDto>`

#### Ví dụ Response:
```json
{
  "statusCode": 200,
  "message": "Lấy số lượng sản phẩm trong giỏ hàng thành công",
  "data": {
    "count": 5 // Tổng số lượng sản phẩm trong giỏ (tính tổng quantity của các item)
  }
}
```

---

## 3. Hướng Dẫn Tích Hợp & Giao Diện (UI/UX Best Practices)

### 3.1. Quản Lý Trạng Thái Toàn Cục (Global State)
*   Nên quản lý số lượng giỏ hàng (`cartCount`) bằng thư viện quản lý trạng thái như **Zustand** hoặc **Redux**.
*   Khi ứng dụng khởi chạy thành công (sau khi đăng nhập), hãy gọi API `/cart/count` để lấy số lượng giỏ hàng và lưu vào Global State nhằm hiển thị badge trên Icon Giỏ hàng ở thanh điều hướng.
*   Mỗi khi gọi thành công API `/cart/add`, `/cart/update/:id`, hoặc `/cart/remove/:id`, hãy kích hoạt gọi lại API `/cart/count` để cập nhật đồng bộ badge giỏ hàng ngay lập tức.

### 3.2. Logic Tăng / Giảm Số Lượng Trên Giao Diện
*   **Chống Spam Request (Throttle/Debounce)**: Khi người dùng bấm liên tục nút `+` hoặc `-`, hãy áp dụng kỹ thuật Debounce/Throttle hoặc hiển thị một chỉ báo Loading nhẹ đè lên nút đó để vô hiệu hóa tạm thời tương tác. Tránh gửi quá nhiều request `PUT /cart/update/:id` liên tục lên server trong khoảng thời gian cực ngắn.
*   **Xóa khi giảm xuống 0**: Khi người dùng nhấn nút `-` tại thời điểm số lượng hiện tại là `1`, hãy hiển thị một hộp thoại xác nhận (Confirm Dialog): *"Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng không?"*. Nếu người dùng chọn Đồng ý, hãy gọi API `/cart/remove/:id`.

### 3.3. Xử Lý Sản Phẩm Ngừng Bán (`isPublished: false`)
Trong API `GET /cart`, mỗi item đều có trường `isPublished`.
*   Nếu `isPublished === false` (sản phẩm đã bị Admin ẩn đi):
    *   Làm mờ phần tử đó trên giao diện giỏ hàng.
    *   Hiển thị nhãn cảnh báo rõ ràng: **"Sản phẩm đã ngừng bán"** hoặc **"Không khả dụng"**.
    *   **Vô hiệu hóa (Disable) checkbox tích chọn** thanh toán cho mặt hàng này.
    *   Nếu người dùng bấm nút "Thanh toán", ứng dụng phải bỏ qua hoặc lọc bỏ tất cả các mục có `isPublished === false` để tránh việc gửi yêu cầu tạo đơn hàng chứa sản phẩm đã ngừng bán (Server sẽ từ chối tạo đơn hàng).

### 3.4. Tích Chọn Thanh Toán (Checkout Selection)
*   Mobile App nên duy trì một danh sách các `cartItemIds` được tích chọn bởi người dùng trong màn hình Giỏ hàng.
*   Tự động tính tổng tiền tạm tính ở phía Client dựa trên danh sách các mục được tích chọn:
    $$\text{Tạm tính} = \sum (\text{price} \times \text{quantity})$$
*   Khi chuyển sang màn hình **Thanh Toán (Checkout)**, hãy gọi API lấy thông tin giỏ hàng được lọc:
    `/cart?ids=id1,id2,id3`
    để hiển thị danh sách hóa đơn chính xác và nhận tổng tiền xác thực từ hệ thống Backend (`cartTotal`), đảm bảo tính chính xác và an toàn thông tin đơn hàng.
