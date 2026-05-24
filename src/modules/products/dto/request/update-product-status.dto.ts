import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateProductStatusDto {
  @ApiProperty({ example: true, description: 'Trạng thái công khai của sản phẩm' })
  @IsBoolean()
  @IsNotEmpty()
  isPublished: boolean;
}
