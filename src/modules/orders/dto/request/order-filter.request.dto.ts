import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Tìm kiếm theo ID đơn hàng hoặc Tên khách hàng' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (ISO Date)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (ISO Date)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
