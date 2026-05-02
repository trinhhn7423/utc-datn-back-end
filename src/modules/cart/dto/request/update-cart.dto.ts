import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto {
  @ApiProperty({ example: 3 })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  quantity: number;
}
