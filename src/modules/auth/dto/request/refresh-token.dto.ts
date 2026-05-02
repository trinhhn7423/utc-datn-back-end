import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'ey...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
