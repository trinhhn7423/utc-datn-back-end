# Hướng Dẫn Tích Hợp Chức Năng Nhận Thông Báo (FCM Push Notifications) Trên Mobile App

Tài liệu này hướng dẫn chi tiết cách cấu hình và tích hợp Firebase Cloud Messaging (FCM) trên ứng dụng di động React Native để nhận thông báo đẩy từ backend NestJS.

---

## 1. Cơ Chế Hoạt Động (Architecture)

1. **Thiết bị (App Mobile)** đăng ký dịch vụ Firebase và nhận về một chuỗi **FCM Token** đại diện cho thiết bị đó.
2. Ngay sau khi **đăng nhập thành công**, App Mobile gửi **FCM Token** này lên Backend qua API đăng ký token.
3. Khi có sự kiện xảy ra ở Backend (Ví dụ: trạng thái đơn hàng thay đổi, cảnh báo hết hàng...), Backend sẽ:
   - Lưu thông báo vào cơ sở dữ liệu.
   - Lấy danh sách các FCM Token thuộc sở hữu của User đó.
   - Gửi yêu cầu đẩy thông báo kèm payload dữ liệu tới Firebase Server (FCM).
4. Firebase Server thực hiện đẩy thông báo xuống thiết bị của người dùng.

---

## 2. Các Bước Cài Đặt và Cấu Hình Trên Mobile App

### Bước 2.1: Cấu hình Firebase Project
Để nhận được thông báo, bạn cần kết nối ứng dụng di động với dịch vụ Firebase:
- **Android**:
  1. Tạo ứng dụng Android trong [Firebase Console](https://console.firebase.google.com/).
  2. Khai báo đúng tên package (Ví dụ: `com.awesomeproject`).
  3. Tải xuống file `google-services.json` và lưu vào thư mục `android/app/`.
- **iOS**:
  1. Đăng ký Apple Developer Account và tạo APNs Keys để liên kết với Firebase.
  2. Tạo ứng dụng iOS trên Firebase Console.
  3. Tải xuống file `GoogleService-Info.plist` và import vào dự án thông qua Xcode.

### Bước 2.2: Cài đặt thư viện React Native Firebase
Chạy các lệnh sau trong thư mục gốc của dự án mobile (`AwesomeProject`):

```bash
# Cài đặt lõi Firebase và module Messaging
yarn add @react-native-firebase/app @react-native-firebase/messaging
```

*Lưu ý riêng cho Android:* Kiểm tra trong file `android/build.gradle` có chứa classpath dependency cho google-services chưa:
```gradle
dependencies {
    // ...
    classpath('com.google.gms:google-services:4.4.1')
}
```
Và trong `android/app/build.gradle` phải apply plugin:
```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## 3. Các API Phía Backend Cần Sử Dụng

| API | Method | Endpoint | Headers | Payload | Mô tả |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Đăng ký FCM Token** | `POST` | `/notifications/fcm-token` | `Authorization: Bearer <token>` | `{"token": "FCM_TOKEN_HERE"}` | Gọi ngay sau khi Login thành công |
| **Lấy danh sách thông báo** | `GET` | `/notifications/me?page=1&size=10` | `Authorization: Bearer <token>` | Không | Lấy lịch sử thông báo của user |
| **Đếm thông báo chưa đọc** | `GET` | `/notifications/me/unread-count` | `Authorization: Bearer <token>` | Không | Hiển thị số lượng lên Badge icon quả chuông |
| **Đọc 1 thông báo** | `PUT` | `/notifications/me/:id/read` | `Authorization: Bearer <token>` | Không | Cập nhật trạng thái đã đọc của 1 thông báo |
| **Đọc tất cả thông báo** | `PUT` | `/notifications/me/read-all` | `Authorization: Bearer <token>` | Không | Đánh dấu tất cả thông báo đã đọc |

---

## 4. Viết Code Tích Hợp Trên React Native

Dưới đây là mã nguồn ví dụ để quản lý vòng đời nhận thông báo và liên kết với API Backend.

### 4.1. Lắng nghe và Đăng ký Token
Tạo file service quản lý thông báo, ví dụ `src/features/notifications/services/NotificationService.ts`:

```typescript
import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import client from '../../../api/client'; // Axios client đã gắn sẵn Bearer Token

class NotificationService {
  // 1. Yêu cầu quyền nhận thông báo (Bắt buộc cho iOS và Android 13+)
  async requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Quyền nhận thông báo: Được phép.');
      await this.getFcmToken();
    }
  }

  // 2. Lấy FCM Token từ Firebase và gửi lên Backend
  async getFcmToken() {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token của thiết bị:', fcmToken);
        // Gửi token lên backend
        await this.registerTokenWithBackend(fcmToken);
      } else {
        console.log('Không lấy được FCM Token.');
      }
    } catch (error) {
      console.error('Lỗi lấy FCM Token:', error);
    }
  }

  // 3. Gọi API đăng ký FCM Token với Backend
  async registerTokenWithBackend(token: string) {
    try {
      await client.post('/notifications/fcm-token', { token });
      console.log('Đăng ký FCM Token với Backend thành công.');
    } catch (error) {
      console.error('Không thể đăng ký FCM Token với Backend:', error);
    }
  }

  // 4. Lắng nghe thông báo ở Foreground (Khi app đang mở)
  listenToForegroundNotifications(onNotificationReceived?: (data: any) => void) {
    return messaging().onMessage(async remoteMessage => {
      console.log('Nhận thông báo khi App đang mở (Foreground):', remoteMessage);
      
      // Hiển thị Alert hoặc thông báo nội bộ dạng banner
      Alert.alert(
        remoteMessage.notification?.title || 'Thông báo mới',
        remoteMessage.notification?.body || ''
      );

      if (onNotificationReceived) {
        onNotificationReceived(remoteMessage.data);
      }
    });
  }

  // 5. Xử lý sự kiện nhấn vào thông báo để chuyển màn hình
  setupNotificationOpenedListeners(navigation: any) {
    // Trường hợp 1: App đang chạy ngầm (Background) và người dùng bấm vào thông báo
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Người dùng bấm vào thông báo từ Background:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage.data, navigation);
    });

    // Trường hợp 2: App đã bị tắt hoàn toàn (Quit State) và khởi động lại từ việc bấm thông báo
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Người dùng bấm vào thông báo khi App đang tắt:', remoteMessage);
          this.handleNotificationNavigation(remoteMessage.data, navigation);
        }
      });
  }

  // 6. Logic chuyển hướng dựa vào dữ liệu gửi kèm (Payload Data)
  private handleNotificationNavigation(data: any, navigation: any) {
    if (!data) return;

    // Ví dụ cấu trúc payload từ backend:
    // data: { orderId: '...', type: 'ORDER_STATUS_UPDATED' }
    if (data.orderId) {
      // Điều hướng người dùng tới danh sách đơn hàng hoặc chi tiết đơn hàng
      navigation.navigate('MyOrders', {
        status: 'pending_confirmation',
      });
    }
  }
}

export const notificationService = new NotificationService();
```

### 4.2. Khai báo Background Handler (Ứng dụng chạy ngầm / bị đóng)
Đối với trường hợp thiết bị nhận thông báo khi app đang tắt hoàn toàn hoặc chạy ngầm, bạn cần khai báo hàm xử lý ở dòng đầu tiên của file entry point dự án (Thường là `index.js` nằm ngoài thư mục gốc):

```javascript
// index.js
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import { name as appName } from './app.json';

// Đăng ký nhận tin nhắn ngầm (Background/Quit State)
// Hàm này phải chạy độc lập, không sử dụng các Hook hay State của React
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Nhận thông báo ngầm (Background/Quit):', remoteMessage);
  // Có thể xử lý lưu log hoặc các tác vụ background khác tại đây
});

AppRegistry.registerComponent(appName, () => App);
```

### 4.3. Khởi tạo trong ứng dụng
Khởi tạo trong file chính của ứng dụng (Ví dụ `App.tsx` hoặc màn hình Home) sau khi đăng nhập thành công:

```typescript
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from './src/features/notifications/services/NotificationService';
import { useAuthStore } from './src/store/authStore';

export default function AppContent() {
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      // 1. Xin quyền & đăng ký token với backend
      notificationService.requestUserPermission();

      // 2. Lắng nghe thông báo ở Foreground
      const unsubscribeForeground = notificationService.listenToForegroundNotifications(data => {
        // Cập nhật lại số Badge quả chuông hoặc refetch danh sách thông báo
      });

      // 3. Cấu hình điều hướng khi bấm thông báo
      notificationService.setupNotificationOpenedListeners(navigation);

      return () => {
        unsubscribeForeground();
      };
    }
  }, [isAuthenticated, navigation]);

  return <Routes />;
}
```

---

## 5. Cấu trúc Payload Dữ liệu Đẩy Từ Backend (Data Payload)

Khi nhận thông báo, ngoài tiêu đề và nội dung, trường `data` sẽ chứa các metadata động giúp lập trình viên mobile lập trình logic xử lý hoặc chuyển màn hình:

- **Thông báo thay đổi trạng thái đơn hàng (`type: 'ORDER_STATUS_UPDATED'`):**
  ```json
  {
    "notificationId": "UUID_THONG_BAO",
    "orderId": "UUID_DON_HANG",
    "type": "ORDER_STATUS_UPDATED",
    "unreadCount": "3" 
  }
  ```
  *Mẹo:* Đọc trường `unreadCount` để cập nhật hiển thị số lượng thông báo chưa đọc (Badge) trên ứng dụng tức thì mà không cần gọi lại API đếm số lượng.
