import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus, OrderStatus } from '../../../../common/enums/order.enum';
import { OrderDetailResponseDto } from './order-detail.response.dto';

export class OrderUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;
}

export class ShippingAddressDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  address: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ type: ShippingAddressDto })
  shippingAddress: ShippingAddressDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [OrderDetailResponseDto] })
  orderDetails?: OrderDetailResponseDto[];

  @ApiPropertyOptional({ type: OrderUserDto })
  user?: OrderUserDto;
}
