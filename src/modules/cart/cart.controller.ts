import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/request/add-to-cart.dto';
import { UpdateCartDto } from './dto/request/update-cart.dto';
import { RemoveMultipleCartDto } from './dto/request/remove-multiple-cart.dto';
import { CartResponseDto } from './dto/response/cart.response.dto';
import { BaseResponse } from '../../core/base/base.response';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.USER)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Thêm thành công' })
  async add(
    @CurrentUser('id') userId: string,
    @Body() addToCartDto: AddToCartDto,
  ): Promise<BaseResponse<null>> {
    await this.cartService.add(userId, addToCartDto);
    return new BaseResponse(200, 'Thêm sản phẩm vào giỏ hàng thành công', null);
  }

  @Put('update/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCartDto: UpdateCartDto,
  ): Promise<BaseResponse<null>> {
    await this.cartService.update(userId, id, updateCartDto);
    return new BaseResponse(200, 'Cập nhật giỏ hàng thành công', null);
  }

  @Delete('remove/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa 1 sản phẩm khỏi giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BaseResponse<null>> {
    await this.cartService.remove(userId, id);
    return new BaseResponse(200, 'Xóa sản phẩm khỏi giỏ hàng thành công', null);
  }

  @Post('remove-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa nhiều sản phẩm khỏi giỏ hàng (sau khi đặt hàng)',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async removeMultiple(
    @CurrentUser('id') userId: string,
    @Body() removeMultipleCartDto: RemoveMultipleCartDto,
  ): Promise<BaseResponse<null>> {
    await this.cartService.removeMultiple(
      userId,
      removeMultipleCartDto.cartItemIds,
    );
    return new BaseResponse(200, 'Xóa các sản phẩm thành công', null);
  }

  @Roles(RoleEnum.USER)
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giỏ hàng' })
  @ApiResponse({ status: 200, type: BaseResponse<CartResponseDto> })
  async getCart(
    @CurrentUser('id') userId: string,
    @Query('ids') ids?: string,
  ): Promise<BaseResponse<CartResponseDto>> {
    let parsedIds: number[] | undefined;
    if (ids) {
      parsedIds = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    }
    const data = await this.cartService.getCart(userId, parsedIds);
    return new BaseResponse(200, 'Lấy giỏ hàng thành công', data);
  }
}
