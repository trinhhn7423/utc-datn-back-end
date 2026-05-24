import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDetailDto {
  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  stock: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Áo Thun Nam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Áo cotton...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Gucci' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'Vietnam' })
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiProperty({ example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({
    description: 'JSON string of details array',
    example: '[{"color":"Red","size":"XL","price":150000,"stock":100}]',
  })
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return plainToInstance(CreateProductDetailDto, parsed);
    } catch (e) {
      return value;
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDetailDto) // Giữ nguyên dòng này
  details: CreateProductDetailDto[];
}
