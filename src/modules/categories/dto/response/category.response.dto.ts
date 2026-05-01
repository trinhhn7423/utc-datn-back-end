import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Áo Thun' })
  name: string;

  @ApiProperty({ example: 'Các loại áo thun thời trang' })
  description: string;
}
