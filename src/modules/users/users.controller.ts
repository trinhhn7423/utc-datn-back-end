import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { BaseResponse } from '../../core/base/base.response';
import { UserResponseDto } from './dto/response/user.response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
