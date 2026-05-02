import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../core/base/base.pagination.request';
import { OrderStatus } from '../../../../common/enums/order.enum';

export class OrderFilterRequestDto extends BasePaginationRequestDto {
  @ApiPropertyOptional({ description: 'Lọc theo trạng thái đơn hàng', enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Lọc theo ID người dùng' })
  @IsString()
  @IsOptional()
  userId?: string;
}
