import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressDto } from './dto/request/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/request/update-user-address.dto';
import { UserAddressResponseDto } from './dto/response/user-address.response.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('User Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user-addresses')
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm địa chỉ mới' })
  @ApiResponse({ status: 201, type: UserAddressResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createUserAddressDto: CreateUserAddressDto,
  ): Promise<UserAddressResponseDto> {
    const address = await this.userAddressesService.create(userId, createUserAddressDto);
    return address.toResponse();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách địa chỉ của tôi' })
  @ApiResponse({ status: 200, type: [UserAddressResponseDto] })
  async findAll(@CurrentUser('id') userId: string): Promise<UserAddressResponseDto[]> {
    const addresses = await this.userAddressesService.findAll(userId);
    return addresses.map((addr) => addr.toResponse());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một địa chỉ' })
  @ApiResponse({ status: 200, type: UserAddressResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: string,
  ): Promise<UserAddressResponseDto> {
    const address = await this.userAddressesService.findById(id, userId);
    return address.toResponse();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  @ApiResponse({ status: 200, type: UserAddressResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: string,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ): Promise<UserAddressResponseDto> {
    const address = await this.userAddressesService.update(id, userId, updateUserAddressDto);
    return address.toResponse();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa địa chỉ (Xóa mềm)' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.userAddressesService.remove(id, userId);
  }
}
