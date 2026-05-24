import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { FcmTokenEntity } from './entities/fcm-token.entity';
import { NotificationsService } from './notifications.service';
import { FcmService } from './fcm.service';
import { SseService } from './sse.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsController } from './notifications.controller';
import { UserNotificationsController } from './user-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, FcmTokenEntity]),
  ],
  controllers: [NotificationsController, UserNotificationsController],
  providers: [
    NotificationsService,
    FcmService,
    SseService,
    NotificationsListener,
  ],
  exports: [NotificationsService, SseService],
})
export class NotificationsModule {}
