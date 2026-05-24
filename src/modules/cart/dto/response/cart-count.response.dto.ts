import { ApiProperty } from '@nestjs/swagger';

export class CartCountResponseDto {
  @ApiProperty({
    description: 'Tổng số lượng sản phẩm trong giỏ hàng',
    example: 5,
  })
  count: number;
}
