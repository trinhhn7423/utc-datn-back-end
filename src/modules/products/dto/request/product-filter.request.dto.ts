import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { BasePaginationRequestDto } from '../../../../core/base/base.pagination.request';

export class ProductFilterRequestDto extends BasePaginationRequestDto {
  @ApiPropertyOptional({ description: 'Lọc theo tên sản phẩm' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID danh mục' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Lọc theo thương hiệu' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ description: 'Lọc theo xuất xứ' })
  @IsString()
  @IsOptional()
  origin?: string;
}
