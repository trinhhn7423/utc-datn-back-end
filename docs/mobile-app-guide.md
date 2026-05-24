# HƯỚNG DẪN TÍCH HỢP API MOBILE APP
## CHỨC NĂNG SẢN PHẨM (PRODUCTS) & DANH MỤC (CATEGORIES) - CLIENT USER

Tài liệu này hướng dẫn lập trình viên phát triển Mobile App (React Native, Flutter, v.v.) cách tích hợp các API liên quan đến **Danh mục (Categories)** và **Sản phẩm (Products)** cho phía khách hàng (User/Public client).

---

## 1. Cơ Chế Xác Thực (Authentication)

*   **API Sản phẩm (`/products`)**: Cho phép truy cập công khai (Public). Mobile App có thể gọi các API này mà không cần đính kèm token (Guest mode). Tuy nhiên, nếu user đã đăng nhập, bạn vẫn nên đính kèm Header để đồng bộ trạng thái hệ thống:
    ```http
    Authorization: Bearer <JWT_TOKEN>
    ```
*   **API Danh mục (`/categories`)**: Hiện tại, các endpoint danh mục được bảo vệ bởi `JwtAuthGuard` và `RolesGuard` ở mức Controller. Do đó, Mobile App **bắt buộc** phải gửi Header chứa token đã đăng nhập của User để lấy dữ liệu danh mục:
    ```http
    Authorization: Bearer <JWT_TOKEN>
    ```

---

## 2. API Danh Mục (Categories API)

### 2.1. Lấy Danh Sách Tất Cả Danh Mục
Dùng để hiển thị thanh danh mục sản phẩm (Category Bar) hoặc danh sách lọc trên màn hình tìm kiếm.

*   **Endpoint**: `/categories`
*   **Method**: `GET`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response**: `CategoryResponseDto[]` (Mảng các danh mục)

#### Ví dụ Response:
```json
[
  {
    "id": 1,
    "name": "Áo Thun Nam",
    "description": "Các loại áo thun nam chất liệu cotton thoáng mát"
  },
  {
    "id": 2,
    "name": "Quần Jean",
    "description": "Quần jean ống đứng, co giãn nhẹ"
  }
]
```

### 2.2. Lấy Chi Tiết Một Danh Mục
*   **Endpoint**: `/categories/:id`
*   **Method**: `GET`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **URL Params**: `id` (number) - ID của danh mục cần lấy chi tiết.
*   **Response**: `CategoryResponseDto`

#### Ví dụ Response:
```json
{
  "id": 1,
  "name": "Áo Thun Nam",
  "description": "Các loại áo thun nam chất liệu cotton thoáng mát"
}
```

---

## 3. API Sản Phẩm (Products API)

Các API dành cho user luôn tự động lọc các sản phẩm có trạng thái hiển thị công khai (`isPublished = true`).

### 3.1. Lấy Danh Sách Sản Phẩm (Phân trang & Lọc)
Dùng cho màn hình danh sách sản phẩm, màn hình tìm kiếm hoặc màn hình sản phẩm theo danh mục.

*   **Endpoint**: `/products`
*   **Method**: `GET`
*   **Headers**: Không bắt buộc (hoặc gửi `Bearer <JWT_TOKEN>` nếu đã đăng nhập)
*   **Query Parameters (Tùy chọn)**:
    *   `page`: Trang hiện tại (mặc định: `1`, tối thiểu `1`).
    *   `size`: Số lượng sản phẩm trên mỗi trang (mặc định: `10`, tối thiểu `1`).
    *   `name`: Tìm kiếm sản phẩm theo tên (hỗ trợ tìm kiếm gần đúng).
    *   `categoryId`: Lọc sản phẩm thuộc danh mục cụ thể (ID danh mục).
    *   `brand`: Lọc sản phẩm theo thương hiệu (hỗ trợ tìm gần đúng).
    *   `origin`: Lọc sản phẩm theo xuất xứ (hỗ trợ tìm gần đúng).

*   **Response**: `BaseResponse<ProductResponseDto[]>`

#### Cấu trúc Response chi tiết:
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách sản phẩm thành công",
  "data": [
    {
      "id": "e4b6c310-9bda-4545-9831-2947a1998fcf",
      "name": "Áo Thun Cotton Basic",
      "description": "Áo thun 100% cotton co giãn 4 chiều",
      "brand": "Uniqlo",
      "origin": "Vietnam",
      "isPublished": true,
      "category": {
        "id": 1,
        "name": "Áo Thun Nam",
        "description": "Các loại áo thun nam chất liệu cotton thoáng mát"
      },
      "details": [
        {
          "id": 12,
          "color": "Black",
          "size": "L",
          "price": "199000.00",
          "stock": 45
        },
        {
          "id": 13,
          "color": "White",
          "size": "XL",
          "price": "199000.00",
          "stock": 10
        }
      ],
      "images": [
        {
          "id": 5,
          "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-1.jpg",
          "isThumbnail": true
        },
        {
          "id": 6,
          "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-2.jpg",
          "isThumbnail": false
        }
      ]
    }
  ],
  "totalElement": 15
}
```

*Lưu ý:*
*   `totalElement` là tổng số sản phẩm thỏa mãn điều kiện lọc trên toàn bộ hệ thống (dùng để tính toán tổng số trang trên Mobile).
*   Mỗi sản phẩm trả về danh sách rút gọn các biến thể (`details`) và hình ảnh (`images`).

---

### 3.2. Lấy Chi Tiết Sản Phẩm Theo ID
Dùng khi người dùng bấm vào một sản phẩm cụ thể để vào màn hình **Chi tiết sản phẩm (Product Detail Screen)**.

*   **Endpoint**: `/products/:id`
*   **Method**: `GET`
*   **Headers**: Không bắt buộc
*   **URL Params**: `id` (string - định dạng UUID)
*   **Response**: `ProductResponseDto`

#### Ví dụ Response:
```json
{
  "id": "e4b6c310-9bda-4545-9831-2947a1998fcf",
  "name": "Áo Thun Cotton Basic",
  "description": "Áo thun 100% cotton co giãn 4 chiều",
  "brand": "Uniqlo",
  "origin": "Vietnam",
  "isPublished": true,
  "category": {
    "id": 1,
    "name": "Áo Thun Nam",
    "description": "Các loại áo thun nam chất liệu cotton thoáng mát"
  },
  "details": [
    {
      "id": 12,
      "color": "Black",
      "size": "L",
      "price": "199000.00",
      "stock": 45
    },
    {
      "id": 13,
      "color": "White",
      "size": "XL",
      "price": "199000.00",
      "stock": 10
    }
  ],
  "images": [
    {
      "id": 5,
      "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-1.jpg",
      "isThumbnail": true
    },
    {
      "id": 6,
      "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-2.jpg",
      "isThumbnail": false
    }
  ]
}
```

---

## 4. Hướng Dẫn Tích Hợp & Giao Diện (UI/UX Best Practices)

### 4.1. Hiển Thị Danh Sách Sản Phẩm (Màn Hình Home / Search)
*   **Ảnh Đại Diện (Thumbnail)**: Trong danh sách `images`, hãy tìm ảnh có `"isThumbnail": true` làm ảnh đại diện chính của sản phẩm. Nếu không có ảnh nào có `isThumbnail: true`, hãy lấy ảnh đầu tiên trong mảng.
*   **Giá Hiển Thị**: Mỗi sản phẩm có nhiều biến thể (`details`) với giá khác nhau. Bạn nên duyệt mảng `details` để tìm mức giá nhỏ nhất và lớn nhất nhằm hiển thị dạng khoảng giá (Ví dụ: `199.000 đ - 250.000 đ`). Nếu tất cả biến thể bằng giá nhau, chỉ cần hiển thị một giá duy nhất.
*   **Xử lý Phân Trang (Infinite Scroll / Load More)**:
    *   Sử dụng thuộc tính `totalElement` trả về từ API `/products` để xác định xem còn dữ liệu để load tiếp hay không.
    *   Công thức kiểm tra: `hasMore = (page * size) < totalElement`.
    *   Khi người dùng cuộn đến cuối danh sách (ví dụ: dùng `onEndReached` trong `FlatList` của React Native), nếu `hasMore` là `true`, hãy gọi API với `page = page + 1`.

### 4.2. Trang Chi Tiết Sản Phẩm (Product Detail Screen)
*   **Carousel Hình Ảnh**: Hiển thị danh sách `images` dưới dạng một slider cuộn ngang. Ảnh thumbnail nên là ảnh hiển thị đầu tiên.
*   **Định Dạng Tiền Tệ**: Lưu ý rằng giá (`price`) trả về từ API có kiểu dữ liệu là chuỗi thập phân (ví dụ: `"199000.00"`). Bạn cần chuyển đổi sang số nguyên và định dạng tiền tệ trước khi hiển thị cho người dùng:
    ```javascript
    const formatPrice = (priceStr) => {
      const price = parseFloat(priceStr);
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };
    // Kết quả: "199.000 ₫"
    ```
*   **Chọn Biến Thể (Color / Size)**:
    *   **Bước 1**: Nhóm các thuộc tính `color` và `size` độc nhất từ danh sách `details` để render ra các nút/chip lựa chọn.
    *   **Bước 2**: Khi người dùng chọn một màu sắc (Color) và kích thước (Size), hãy tìm kiếm phần tử tương ứng trong mảng `details` trùng khớp với cả 2 giá trị này.
    *   **Bước 3**: Cập nhật giá tiền hiển thị trên màn hình tương ứng với biến thể được chọn.
    *   **Bước 4**: Kiểm tra số lượng tồn kho (`stock`) của biến thể đó.
        *   Nếu `stock > 0`: Hiển thị số lượng còn lại và cho phép bấm nút **"Thêm vào giỏ hàng"** hoặc **"Mua ngay"**.
        *   Nếu `stock === 0` hoặc không tìm thấy biến thể phù hợp: Vô hiệu hóa (Disable) nút mua hàng và hiển thị dòng chữ **"Hết hàng"**.

### 4.3. Xử Lý Trạng Thái Lỗi
*   **Sản phẩm bị ẩn**: Nếu Admin ẩn sản phẩm (`isPublished = false`), khi gọi API `/products/:id`, Backend sẽ ném ra lỗi `404 Not Found` với thông điệp `"Product không tồn tại"`. Hãy xử lý trường hợp này bằng cách hiển thị màn hình thông báo thân thiện hoặc chuyển hướng người dùng quay lại trang trước đó.
