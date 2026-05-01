import { ApiProperty } from '@nestjs/swagger';

export class ProductDetailResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Red' })
  color: string;

  @ApiProperty({ example: 'XL' })
  size: string;

  @ApiProperty({ example: '150000.00' })
  price: string; // Decimal is often returned as string to avoid precision loss

  @ApiProperty({ example: 100 })
  stock: number;
}
