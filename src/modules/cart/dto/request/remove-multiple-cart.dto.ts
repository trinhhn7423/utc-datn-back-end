import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class RemoveMultipleCartDto {
  @ApiProperty({ example: [1, 2, 3] })
  @IsNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  cartItemIds: number[];
}
