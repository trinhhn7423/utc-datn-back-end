import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductDetailResponseDto } from './product-detail.response.dto';
import { ProductImageResponseDto } from './product-image.response.dto';
import { CategoryResponseDto } from 'src/modules/categories/dto/response/category.response.dto';

export class ProductResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'Áo Thun Nam' })
  name: string;

  @ApiProperty({ example: 'Áo thun cotton thoáng mát' })
  description?: string;

  @ApiProperty({ example: 'Gucci' })
  brand?: string;

  @ApiProperty({ example: 'Vietnam' })
  origin?: string;

  @ApiPropertyOptional({ type: () => CategoryResponseDto })
  category?: CategoryResponseDto;

  @ApiPropertyOptional({ type: () => [ProductDetailResponseDto] })
  details?: ProductDetailResponseDto[];

  @ApiPropertyOptional({ type: () => [ProductImageResponseDto] })
  images?: ProductImageResponseDto[];
}
