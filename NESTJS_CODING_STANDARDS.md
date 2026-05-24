# NestJS Coding Standards & Skill for Antigravity

Bạn là một Expert Backend Developer chuyên về NestJS, TypeScript và kiến trúc Monolithic. Bạn phải tuân thủ tuyệt đối các quy tắc sau đây trong mọi dòng code:

### 1. Coding Style & Array Manipulation
- **KHÔNG** sử dụng vòng lặp `for...in` hoặc `for (let i = 0; ...)`.
- **SỬ DỤNG** các functional methods của mảng: `map`, `reduce`, `filter`, `forEach`.
- **ƯU TIÊN** thư viện `lodash` cho các thao tác xử lý object/collection phức tạp (ví dụ: `groupBy`, `mapKeys`, `keyBy`, `omit`, `pick`...).

### 2. Xử lý Bất đồng bộ (Async/Await)
- **THỰC THI TUẦN TỰ**: Trong các tác vụ đồng bộ dữ liệu hoặc mảng chứa tác vụ bất đồng bộ, sử dụng `for...of` kết hợp với `await`.
- **HẠN CHẾ `Promise.all`**: Tránh chạy song song để ngăn chặn các vấn đề về concurrency, lock data hoặc quá tải connection pool.

### 3. Typescript & Type Safety
- **TUYỆT ĐỐI KHÔNG DÙNG `any`**.
- **ĐỊNH NGHĨA RÕ RÀNG**: Mọi Request, Response, Payload, và biến nội bộ phải có Type/Interface/Class.
- **EXPLICIT RETURN TYPE**: Các hàm trong Controller bắt buộc khai báo kiểu trả về (ví dụ: `Promise<UserResponseDto>`).

### 4. NestJS Architecture & Validation
- **3-LAYER ARCHITECTURE**: Controller -> Service -> Repository/DAO.
  - **KHÔNG** viết business logic vào tầng Repository. Repository chỉ thực hiện thao tác tương tác với DB.
  - **CUSTOM REPOSITORY**: Khi tạo custom repository, luôn `extends` trực tiếp từ `Repository` của TypeORM thay vì bọc (wrap) nó. Ví dụ:
    ```typescript
    @Injectable()
    export class UsersRepository extends Repository<UserEntity> {}
    ```
- **VALIDATION**: Sử dụng DTO với `class-validator` và `class-transformer`.
- **EXCEPTIONS**: Sử dụng các Standard HTTP Exceptions của NestJS (ví dụ: `NotFoundException`, `ConflictException`). **KHÔNG** return status code thủ công qua object `res`.

### 5. Database & Migrations
- **ENTITY/SCHEMA ONLY**: Tập trung vào Entity model và tối ưu query/ORM.
- **KHÔNG** viết file DB Migrations trong code (thiết kế bảng được thực hiện trực tiếp trên DB).

### 6. API Documentation (Swagger)
- **CONTROLLER**: Sử dụng `@ApiTags`, `@ApiOperation`, `@ApiResponse`.
- **DTO**: Sử dụng `@ApiProperty` hoặc `@ApiPropertyOptional` kèm mô tả và example.

### 7. Module Structure & Entity Logic
- **CẤU TRÚC DTO**: Phải chia thành 2 thư mục:
  - `dto/request/`: Các class nhận dữ liệu vào.
  - `dto/response/`: Các class định nghĩa kiểu trả về.
- **ENTITY LOGIC**:
  - **BẮT BUỘC** viết các hàm static (VD: `static create(...)`) bên trong Entity để đóng gói logic khởi tạo đối tượng (tránh new Entity() thủ công rải rác ở tầng Service).
  - **BẮT BUỘC** viết các hàm instance (VD: `update(dto)`, `markAsDeleted()`) bên trong Entity để cập nhật dữ liệu hoặc thay đổi trạng thái (tránh gán `entity.field = value` rải rác ở Service).
  - Viết hàm `init()` để khởi tạo giá trị mặc định/format trước khi lưu.
  - **BẮT BUỘC** viết hàm `toResponse()` để map Entity sang Response DTO (loại bỏ trường nhạy cảm, format dữ liệu).
  - **BẮT BUỘC** đặt tên các thuộc tính (fields) trong Entity theo chuẩn `camelCase` thay vì `snake_case`. Ví dụ: `fullName`, `createdAt`, `hashedRefreshToken`. (Nếu cơ sở dữ liệu dùng `snake_case`, hãy cấu hình ánh xạ thông qua `@Column({ name: 'full_name' })`).

### 8. Authentication & Authorization
- **BẮT BUỘC** khai báo `@ApiBearerAuth()` và bảo vệ API bằng `@UseGuards(JwtAuthGuard, RolesGuard)` ở tầng Controller cho toàn bộ dự án (ngoại trừ module Auth hoặc các API public có chủ đích).
- Có thể dùng kèm decorator `@Roles(RoleEnum.ADMIN, RoleEnum.USER)` để phân quyền linh hoạt theo từng Controller hoặc Endpoint.
- **LẤY THÔNG TIN USER**: Sử dụng decorator `@CurrentUser()` (ví dụ: `@CurrentUser('id') userId: string` hoặc `@CurrentUser() user: UserEntity`) ở tham số của Controller để lấy thông tin user đang đăng nhập từ JWT Token. **TUYỆT ĐỐI KHÔNG** yêu cầu Frontend truyền `userId` qua `@Query` hoặc `@Body`.
