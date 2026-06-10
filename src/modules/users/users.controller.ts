import { Controller, Get, Param, Query, UseGuards, Post, Body, Patch, Delete } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { UsersService } from './users.service';
import { UserFilterRequestDto } from './dto/request/user-filter.request.dto';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import { BaseResponse } from '../../core/base/base.response';
import { UserResponseDto } from './dto/response/user.response.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/counters')
  @ApiOperation({
    summary:
      'Lấy số lượng tổng đơn, tổng đánh giá, tổng đã xem của tôi và tăng lượt xem',
  })
  @ApiResponse({ status: 200 })
  async getMyCounters(
    @CurrentUser('id') userId: string,
  ): Promise<
    BaseResponse<{
      totalOrders: number;
      totalReviews: number;
      viewsCount: number;
    }>
  > {
    const data = await this.usersService.getCounters(userId);
    return new BaseResponse(200, 'Lấy số liệu thống kê thành công', data);
  }

  @Get('me/order-counters')
  @ApiOperation({
    summary:
      'Lấy số lượng đơn hàng theo các trạng thái và số lượng cần đánh giá',
  })
  @ApiResponse({ status: 200 })
  async getMyOrderCounters(
    @CurrentUser('id') userId: string,
  ): Promise<
    BaseResponse<{
      pendingConfirmation: number;
      pendingPickup: number;
      delivering: number;
      needReview: number;
    }>
  > {
    const data = await this.usersService.getOrderCounters(userId);
    return new BaseResponse(
      200,
      'Lấy số liệu thống kê đơn hàng thành công',
      data,
    );
  }

  @Roles(RoleEnum.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản người dùng (Admin)' })
  @ApiResponse({ status: 201, type: BaseResponse<UserResponseDto> })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<BaseResponse<UserResponseDto>> {
    const user = await this.usersService.create(createUserDto);
    return new BaseResponse(
      201,
      'Tạo tài khoản thành công',
      user.toResponse(),
    );
  }

  @Roles(RoleEnum.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng có phân trang (Admin)' })
  @ApiResponse({ status: 200, type: BaseResponse<UserResponseDto[]> })
  async findAll(
    @Query() filterDto: UserFilterRequestDto,
  ): Promise<BaseResponse<UserResponseDto[]>> {
    const [users, totalElement] = await this.usersService.findAll(filterDto);
    const data = users.map((user) => user.toResponse());
    return new BaseResponse(
      200,
      'Lấy danh sách người dùng thành công',
      data,
      totalElement,
    );
  }

  @Roles(RoleEnum.ADMIN)
  @Get('counters')
  @ApiOperation({ summary: 'Lấy số lượng người dùng theo vai trò (Admin)' })
  @ApiResponse({ status: 200 })
  async getAdminCounters(): Promise<BaseResponse<{ total: number; admins: number; customers: number }>> {
    const data = await this.usersService.getAdminCounters();
    return new BaseResponse(200, 'Lấy số liệu thống kê người dùng thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết người dùng (Admin)' })
  @ApiResponse({ status: 200, type: BaseResponse<UserResponseDto> })
  async findOne(
    @Param('id') id: string,
  ): Promise<BaseResponse<UserResponseDto>> {
    const user = await this.usersService.findById(id);
    return new BaseResponse(
      200,
      'Lấy thông tin chi tiết thành công',
      user.toResponse(),
    );
  }

  @Roles(RoleEnum.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tài khoản người dùng (Admin)' })
  @ApiResponse({ status: 200, type: BaseResponse<UserResponseDto> })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<BaseResponse<UserResponseDto>> {
    const user = await this.usersService.update(id, updateUserDto);
    return new BaseResponse(
      200,
      'Cập nhật tài khoản thành công',
      user.toResponse(),
    );
  }

  @Roles(RoleEnum.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài khoản người dùng (Admin)' })
  @ApiResponse({ status: 200, type: BaseResponse<UserResponseDto> })
  async remove(
    @Param('id') id: string,
  ): Promise<BaseResponse<any>> {
    await this.usersService.delete(id);
    return new BaseResponse(
      200,
      'Xóa tài khoản thành công',
      null,
    );
  }
}
