import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { RoleEnum } from '../../../common/enums/role.enum';
import { NotificationResponseDto } from '../dto/response/notification.response.dto';

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
  LOW_STOCK_WARNING = 'LOW_STOCK_WARNING',
}

@Entity('notifications')
@Index('idx_notif_recipient', ['recipientId', 'recipientRole'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @Column({ type: 'enum', enum: RoleEnum, name: 'recipient_role' })
  recipientRole: RoleEnum;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  toResponse(): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = this.id;
    dto.title = this.title;
    dto.content = this.content;
    dto.type = this.type;
    dto.referenceId = this.referenceId;
    dto.isRead = this.isRead;
    dto.createdAt = this.createdAt;
    return dto;
  }
}
