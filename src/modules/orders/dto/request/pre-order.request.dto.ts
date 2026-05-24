import { IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PreOrderItemDto {
  @IsInt()
  @IsOptional()
  productDetailId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}

export class PreOrderRequestDto {
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  cartItemIds?: number[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PreOrderItemDto)
  items?: PreOrderItemDto[];
}
