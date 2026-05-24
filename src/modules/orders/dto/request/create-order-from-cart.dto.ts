import { IsNotEmpty, IsEnum, IsArray, ArrayMinSize, IsInt } from 'class-validator';
import { PaymentMethod } from '../../../../common/enums/order.enum';

export class CreateOrderFromCartDto {
  @IsInt()
  @IsNotEmpty()
  userAddressId: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  cartItemIds: number[];
}
