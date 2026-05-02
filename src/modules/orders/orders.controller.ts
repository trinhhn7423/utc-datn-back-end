import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { OrdersService } from './orders.service';
import { OrderFilterRequestDto } from './dto/request/order-filter.request.dto';
import { BaseResponse } from '../../core/base/base.response';
import { OrderResponseDto } from './dto/response/order.response.dto';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';
import { Roles } from 'src/core/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng có phân trang và lọc' })
  @ApiResponse({ status: 200, type: BaseResponse<OrderResponseDto[]> })
  async findAll(
    @Query() filterDto: OrderFilterRequestDto,
  ): Promise<BaseResponse<OrderResponseDto[]>> {
    const [orders, totalElement] = await this.ordersService.findAll(filterDto);
    const data = orders.map((order) => order.toResponse());
    return new BaseResponse(
      200,
      'Lấy danh sách đơn hàng thành công',
      data,
      totalElement,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Tạo đơn hàng mới' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async create(
    @Query('userId') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.createOrder(userId, createOrderDto);
    return order.toResponse();
  }

  @Roles(RoleEnum.ADMIN)
  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.updateOrderStatus(
      id,
      status,
      paymentStatus,
    );
    return order.toResponse();
  }
}
