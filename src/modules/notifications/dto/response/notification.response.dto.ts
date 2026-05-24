import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  type: NotificationType;

  @ApiProperty({ nullable: true })
  referenceId: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}
