import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Req,
  UseGuards,
  Sse,
  Header,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { NotificationsService } from './notifications.service';
import { SseService } from './sse.service';
import { GetNotificationsRequestDto } from './dto/request/get-notifications.request.dto';
import { BaseResponse } from '../../core/base/base.response';
import { NotificationResponseDto } from './dto/response/notification.response.dto';
import express from 'express';

@ApiTags('Notifications - Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@Controller('notifications/admin')
export class NotificationsController implements OnApplicationShutdown {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseService: SseService,
  ) {}

  @Sse('stream')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({
    summary: 'SSE stream - Admin đăng ký nhận thông báo realtime',
  })
  stream(
    @CurrentUser('id') adminId: string,
    @Req() req: express.Request,
  ): Observable<MessageEvent> {
    const subject = this.sseService.addConnection(adminId);

    // Khi client ngắt kết nối, dọn dẹp stream
    req.on('close', () => {
      this.sseService.removeConnection(adminId);
    });

    return subject.asObservable();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của Admin' })
  @ApiResponse({ status: 200, type: BaseResponse<NotificationResponseDto[]> })
  async getNotifications(
    @CurrentUser('id') adminId: string,
    @Query() dto: GetNotificationsRequestDto,
  ): Promise<BaseResponse<NotificationResponseDto[]>> {
    const [data, total] = await this.notificationsService.getNotifications(
      adminId,
      RoleEnum.ADMIN,
      dto.page,
      dto.size,
    );
    return new BaseResponse(
      200,
      'Lấy danh sách thông báo thành công',
      data,
      total,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc của Admin' })
  async getUnreadCount(
    @CurrentUser('id') adminId: string,
  ): Promise<BaseResponse<{ count: number }>> {
    const count = await this.notificationsService.getUnreadCount(
      adminId,
      RoleEnum.ADMIN,
    );
    return new BaseResponse(200, 'OK', { count });
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo đã đọc' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<BaseResponse<null>> {
    await this.notificationsService.markAsRead(id, adminId);
    return new BaseResponse(200, 'Đã đánh dấu đã đọc', null);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  async markAllAsRead(
    @CurrentUser('id') adminId: string,
  ): Promise<BaseResponse<null>> {
    await this.notificationsService.markAllAsRead(adminId, RoleEnum.ADMIN);
    return new BaseResponse(200, 'Đã đánh dấu tất cả là đã đọc', null);
  }

  onApplicationShutdown(): void {
    // Cleanup handled by SseService.onModuleDestroy
  }
}
