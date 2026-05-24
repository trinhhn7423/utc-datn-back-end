import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export interface ParsedDetailItem {
  id?: number;
  color: string;
  size: string;
  price: number;
  stock: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(String(value), 10) : undefined))
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'JSON string của mảng details' })
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) return parsed;
      return parsed.map((item: Record<string, unknown>) => ({
        id: item['id'] !== undefined ? parseInt(String(item['id']), 10) : undefined,
        color: String(item['color'] ?? ''),
        size: String(item['size'] ?? ''),
        price: parseFloat(String(item['price'] ?? 0)),
        stock: parseInt(String(item['stock'] ?? 0), 10),
      }));
    } catch {
      return value;
    }
  })
  @IsArray()
  @IsOptional()
  details?: ParsedDetailItem[];

  @ApiPropertyOptional({ description: 'JSON string của mảng retained image IDs' })
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) return parsed;
      return parsed.map((v) => Number(v));
    } catch {
      return value;
    }
  })
  @IsArray()
  @IsOptional()
  retained_image_ids?: number[];
}

