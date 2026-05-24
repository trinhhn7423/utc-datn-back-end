import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, ArrayMinSize, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../../common/enums/order.enum';

export class OrderItemDto {
  @IsInt()
  @IsNotEmpty()
  productDetailId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  userAddressId: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
