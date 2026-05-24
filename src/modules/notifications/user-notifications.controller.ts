import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { FcmService } from './fcm.service';
import { GetNotificationsRequestDto } from './dto/request/get-notifications.request.dto';
import { RegisterFcmTokenRequestDto } from './dto/request/register-fcm-token.request.dto';
import { NotificationResponseDto } from './dto/response/notification.response.dto';
import { BaseResponse } from '../../core/base/base.response';
import { RoleEnum } from '../../common/enums/role.enum';

@ApiTags('Notifications - User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class UserNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly fcmService: FcmService,
  ) {}

  @Post('fcm-token')
  @ApiOperation({ summary: 'Đăng ký FCM Token của thiết bị (Flutter gọi sau khi đăng nhập)' })
  async registerFcmToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterFcmTokenRequestDto,
  ): Promise<BaseResponse<null>> {
    await this.fcmService.registerToken(userId, dto.token);
    return new BaseResponse(200, 'Đăng ký FCM Token thành công', null);
  }

  @Get('me')
  @ApiOperation({ summary: 'Lấy danh sách thông báo của User' })
  @ApiResponse({ status: 200, type: BaseResponse<NotificationResponseDto[]> })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() dto: GetNotificationsRequestDto,
  ): Promise<BaseResponse<NotificationResponseDto[]>> {
    const [data, total] = await this.notificationsService.getNotifications(
      userId,
      RoleEnum.USER,
      dto.page,
      dto.size,
    );
    return new BaseResponse(200, 'Lấy danh sách thông báo thành công', data, total);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc của User' })
  async getMyUnreadCount(
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<{ count: number }>> {
    const count = await this.notificationsService.getUnreadCount(userId, RoleEnum.USER);
    return new BaseResponse(200, 'OK', { count });
  }

  @Put('me/:id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo đã đọc' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<null>> {
    await this.notificationsService.markAsRead(id, userId);
    return new BaseResponse(200, 'Đã đánh dấu đã đọc', null);
  }

  @Put('me/read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<null>> {
    await this.notificationsService.markAllAsRead(userId, RoleEnum.USER);
    return new BaseResponse(200, 'Đã đánh dấu tất cả là đã đọc', null);
  }
}
