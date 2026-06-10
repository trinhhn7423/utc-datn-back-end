import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { BaseResponse } from '../../core/base/base.response';

@ApiTags('Sepay')
@Controller('sepay-webhook')
export class SepayController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhận webhook từ Sepay để cập nhật trạng thái thanh toán',
  })
  async handleWebhook(@Body() body: any) {
    return this.ordersService.processSepayWebhook(body);
  }
}
