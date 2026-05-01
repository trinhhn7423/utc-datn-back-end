import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'https://mock-cloud.com/images/mock-123.jpg' })
  imageUrl: string;

  @ApiProperty({ example: true })
  isThumbnail: boolean;
}
