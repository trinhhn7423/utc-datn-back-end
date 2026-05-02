import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserAddressDto {
  @ApiPropertyOptional({ example: 'Nguyen Van C' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  receiverName?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(11)
  receiverPhone?: string;

  @ApiPropertyOptional({ example: 'Số 2, Đường 3, Phường 4, Quận 5, TP.HCM' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  detailAddress?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
