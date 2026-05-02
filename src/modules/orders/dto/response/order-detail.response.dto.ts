import { ApiProperty } from '@nestjs/swagger';

export class OrderDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  productDetailId: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  priceAtPurchase: number;
}
