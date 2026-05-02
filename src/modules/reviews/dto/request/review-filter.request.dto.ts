import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../core/base/base.pagination.request';
import { Type } from 'class-transformer';

export class ReviewFilterRequestDto extends BasePaginationRequestDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID sản phẩm' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo rating' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @IsIn([1, 2, 3, 4, 5])
  rating?: number;
}
