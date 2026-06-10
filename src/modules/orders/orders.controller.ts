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
import { CurrentUser } from '../../core/decorators/current-user.decorator';
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
import { CreateOrderFromCartDto } from './dto/request/create-order-from-cart.dto';
import { PreOrderRequestDto } from './dto/request/pre-order.request.dto';
import { PreOrderResponseDto } from './dto/response/pre-order.response.dto';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';
import { Roles } from 'src/core/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { UserEntity } from '../users/entities/user.entity';

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
    @CurrentUser() user: UserEntity,
  ): Promise<BaseResponse<OrderResponseDto[]>> {
    if (user.role?.name !== RoleEnum.ADMIN) {
      filterDto.userId = user.id;
    }
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
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.createOrder(userId, createOrderDto);
    return order.toResponse();
  }

  @Post('cart')
  @ApiOperation({ summary: 'Tạo đơn hàng từ giỏ hàng' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  async createFromCart(
    @CurrentUser('id') userId: string,
    @Body() createOrderFromCartDto: CreateOrderFromCartDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.createOrderFromCart(
      userId,
      createOrderFromCartDto,
    );
    return order.toResponse();
  }

  @Post('pre-order')
  @ApiOperation({
    summary: 'Xem trước thông tin đơn hàng (từ giỏ hàng hoặc mua ngay)',
  })
  @ApiResponse({ status: 200, type: BaseResponse<PreOrderResponseDto> })
  async preOrder(
    @CurrentUser('id') userId: string,
    @Body() preOrderRequestDto: PreOrderRequestDto,
  ): Promise<BaseResponse<PreOrderResponseDto>> {
    const data = await this.ordersService.preOrder(userId, preOrderRequestDto);
    return new BaseResponse(200, 'Lấy thông tin pre-order thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng' })
  @ApiResponse({ status: 200, type: BaseResponse<OrderResponseDto> })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
  ): Promise<BaseResponse<OrderResponseDto>> {
    const order = await this.ordersService.updateOrderStatus(
      id,
      status,
      paymentStatus,
    );
    return new BaseResponse(
      200,
      'Cập nhật trạng thái đơn hàng thành công',
      order.toResponse(),
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng' })
  @ApiResponse({ status: 200, type: BaseResponse<OrderResponseDto> })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<OrderResponseDto>> {
    const order = await this.ordersService.cancelOrder(id, userId);
    return new BaseResponse(200, 'Hủy đơn hàng thành công', order.toResponse());
  }

  @Get(':id/qr-code')
  @ApiOperation({
    summary: 'Tạo URL mã QR chuyển tiền qua Sepay cho đơn hàng',
  })
  @ApiResponse({ status: 200 })
  async generateQrCode(
    @Param('id') id: string,
    @Query('bank') bank: string,
    @Query('acc') acc: string,
    @CurrentUser('id') userId: string,
    @Query('template') template?: string,
  ): Promise<BaseResponse<{ qrUrl: string }>> {
    const order = await this.ordersService.findOne(id, userId);

    const params = new URLSearchParams();
    if (bank) params.append('bank', bank);
    if (acc) params.append('acc', acc);
    
    // Set số tiền từ tổng số tiền của đơn hàng
    params.append('amount', Number(order.totalAmount).toString());
    
    // Set nội dung chuyển khoản theo cú pháp: Thanh toan don hang SE+mã đơn hàng
    params.append('des', `Thanh toan don hang SE${order.id}`);
    
    if (template) params.append('template', template);

    const qrUrl = `https://qr.sepay.vn/img?${params.toString()}`;
    return new BaseResponse(200, 'Tạo link QR thành công', { qrUrl });
  }
}
