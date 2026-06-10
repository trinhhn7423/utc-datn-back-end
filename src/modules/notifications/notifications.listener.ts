import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { SseService } from './sse.service';
import { FcmService } from './fcm.service';
import { NotificationType } from './entities/notification.entity';
import { RoleEnum } from '../../common/enums/role.enum';
import { OrderStatus } from '../../common/enums/order.enum';

// ---- Event payload interfaces ----
export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  totalAmount: number;
}

export interface OrderStatusUpdatedEvent {
  orderId: string;
  userId: string;
  newStatus: OrderStatus;
}

export interface LowStockWarningEvent {
  productDetailId: number;
  productName: string;
  color: string;
  size: string;
  stock: number;
}

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseService: SseService,
    private readonly fcmService: FcmService,
  ) {}
  @OnEvent('order.created', { async: true })
  async handleOrderCreated(payload: OrderCreatedEvent): Promise<void> {
    try {
      // log xử lý thông báo
      this.logger.log('Handling order.created event', payload);
      const title = 'Đơn hàng mới';
      const content = `Có đơn hàng mới #${payload.orderId.slice(0, 8).toUpperCase()} trị giá ${Number(payload.totalAmount).toLocaleString('vi-VN')}đ vừa được đặt.`;

      // Lưu thông báo vào DB cho Admin
      const notification = await this.notificationsService.createNotification({
        recipientId: 'ADMIN', // Hoặc có thể lưu theo từng adminId cụ thể
        recipientRole: RoleEnum.ADMIN,
        title,
        content,
        type: NotificationType.ORDER_CREATED,
        referenceId: payload.orderId,
      });

      // Lấy unread count của Admin
      const unreadCount = await this.notificationsService.getUnreadCount(
        'ADMIN',
        RoleEnum.ADMIN,
      );

      // Push SSE đến tất cả Admin đang online
      this.sseService.broadcastToAllAdmins({
        type: 'order.created',
        data: {
          notificationId: notification.id,
          orderId: payload.orderId,
          title,
          content,
          unreadCount,
          createdAt: notification.createdAt,
        },
      });
    } catch (error) {
      this.logger.error('Error handling order.created event', error);
    }
  }

  @OnEvent('order.status_updated', { async: true })
  async handleOrderStatusUpdated(
    payload: OrderStatusUpdatedEvent,
  ): Promise<void> {
    try {
      const statusLabels: Record<OrderStatus, string> = {
        [OrderStatus.CONFIRMED]: 'đã được xác nhận',
        [OrderStatus.SHIPPING]: 'đang được giao',
        [OrderStatus.COMPLETED]: 'đã được giao thành công',
        [OrderStatus.CANCELLED]: 'đã bị hủy',
        [OrderStatus.PENDING]: 'đang chờ xác nhận',
      };
      const statusLabel = statusLabels[payload.newStatus] ?? payload.newStatus;

      const title = 'Cập nhật đơn hàng';
      const content = `Đơn hàng #${payload.orderId.slice(0, 8).toUpperCase()} của bạn ${statusLabel}.`;

      const notification = await this.notificationsService.createNotification({
        recipientId: payload.userId,
        recipientRole: RoleEnum.USER,
        title,
        content,
        type: NotificationType.ORDER_STATUS_UPDATED,
        referenceId: payload.orderId,
      });

      // Lấy số thông báo chưa đọc mới nhất để gửi kèm vào FCM data payload
      const unreadCount = await this.notificationsService.getUnreadCount(
        payload.userId,
        RoleEnum.USER,
      );

      // Gửi FCM đến thiết bị mobile của user
      await this.fcmService.sendPushNotification(
        payload.userId,
        title,
        content,
        {
          notificationId: notification.id,
          orderId: payload.orderId,
          type: NotificationType.ORDER_STATUS_UPDATED,
          unreadCount: String(unreadCount),
        },
      );
    } catch (error) {
      this.logger.error('Error handling order.status_updated event', error);
    }
  }

  @OnEvent('low_stock.warning', { async: true })
  async handleLowStockWarning(payload: LowStockWarningEvent): Promise<void> {
    try {
      const title = 'Cảnh báo sắp hết hàng';
      const content = `Sản phẩm "${payload.productName}" (Màu: ${payload.color}, Size: ${payload.size}) chỉ còn ${payload.stock} sản phẩm trong kho.`;

      const notification = await this.notificationsService.createNotification({
        recipientId: 'ADMIN',
        recipientRole: RoleEnum.ADMIN,
        title,
        content,
        type: NotificationType.LOW_STOCK_WARNING,
        referenceId: String(payload.productDetailId),
      });

      const unreadCount = await this.notificationsService.getUnreadCount(
        'ADMIN',
        RoleEnum.ADMIN,
      );

      this.sseService.broadcastToAllAdmins({
        type: 'low_stock.warning',
        data: {
          notificationId: notification.id,
          productDetailId: payload.productDetailId,
          productName: payload.productName,
          stock: payload.stock,
          title,
          content,
          unreadCount,
          createdAt: notification.createdAt,
        },
      });
    } catch (error) {
      this.logger.error('Error handling low_stock.warning event', error);
    }
  }
}
