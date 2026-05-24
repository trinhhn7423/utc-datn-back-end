import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterFcmTokenRequestDto {
  @ApiProperty({ example: 'fcm-device-token-string' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
