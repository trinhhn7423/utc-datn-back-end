import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductDetailInOrderDto {
  @ApiProperty({ description: 'Màu sắc biến thể sản phẩm' })
  color: string;

  @ApiProperty({ description: 'Kích cỡ biến thể sản phẩm' })
  size: string;

  @ApiProperty({ description: 'Giá hiện tại của biến thể (dạng string decimal)' })
  price: string;

  @ApiProperty({ description: 'Số lượng tồn kho hiện tại' })
  stock: number;

  @ApiPropertyOptional({ description: 'Tên sản phẩm' })
  productName?: string;

  @ApiPropertyOptional({ description: 'Ảnh đại diện của sản phẩm' })
  productThumbnail?: string;
}

export class OrderDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  productDetailId: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  priceAtPurchase: number;

  @ApiPropertyOptional({
    type: ProductDetailInOrderDto,
    description: 'Thông tin biến thể sản phẩm (color, size, price, stock). Có mặt khi relation productDetail được load.',
  })
  productDetail?: ProductDetailInOrderDto;
}
