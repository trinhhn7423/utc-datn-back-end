import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnreviewedItemResponseDto {
  @ApiProperty({ example: 'order-uuid-string' })
  orderId: string;

  @ApiProperty({ example: 'product-uuid-string' })
  productId: string;

  @ApiProperty({ example: 'Áo Thun Cotton Basic' })
  productName: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v1570975200/products/ao-thun-1.jpg' })
  productThumbnail?: string;

  @ApiProperty({ example: 'Black' })
  color: string;

  @ApiProperty({ example: 'L' })
  size: string;

  @ApiProperty({ example: 199000 })
  priceAtPurchase: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: '2026-05-22T13:24:24.000Z' })
  orderCreatedAt: Date;
}
