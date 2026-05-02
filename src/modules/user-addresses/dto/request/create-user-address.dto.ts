import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserAddressDto {
  @ApiProperty({ example: 'Nguyen Van B' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  receiverName: string;

  @ApiProperty({ example: '0912345678' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @MinLength(10)
  @MaxLength(11)
  receiverPhone: string;

  @ApiProperty({ example: 'Số 1, Đường 2, Phường 3, Quận 4, TP.HCM' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ chi tiết không được để trống' })
  detailAddress: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
