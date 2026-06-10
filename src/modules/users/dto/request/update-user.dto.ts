import { IsEmail, IsOptional, IsString, MinLength, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 2, description: '1: ADMIN, 2: USER' })
  @IsInt()
  @IsOptional()
  roleId?: number;

  @ApiPropertyOptional({ example: 'https://example.com/avatar2.jpg' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Cầu Giấy, Hà Nội' })
  @IsString()
  @IsOptional()
  address?: string;
}
