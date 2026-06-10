import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
} from './entities/notification.entity';
import { NotificationResponseDto } from './dto/response/notification.response.dto';
import { RoleEnum } from '../../common/enums/role.enum';

export interface CreateNotificationData {
  recipientId: string;
  recipientRole: RoleEnum;
  title: string;
  content: string;
  type: NotificationType;
  referenceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async createNotification(
    data: CreateNotificationData,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async getNotifications(
    recipientId: string,
    role: RoleEnum,
    page: number = 1,
    size: number = 10,
  ): Promise<[NotificationResponseDto[], number]> {
    const [entities, total] = await this.notificationRepository.findAndCount({
      where: { recipientId, recipientRole: role },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    const dtos = entities.map((n) => n.toResponse());
    return [dtos, total];
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, recipientId },
      { isRead: true },
    );
  }

  async markAllAsRead(recipientId: string, role: RoleEnum): Promise<void> {
    await this.notificationRepository.update(
      { recipientId, recipientRole: role, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(recipientId: string, role: RoleEnum): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId, recipientRole: role, isRead: false },
    });
  }
}
