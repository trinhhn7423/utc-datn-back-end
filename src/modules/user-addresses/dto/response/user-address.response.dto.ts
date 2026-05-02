import { ApiProperty } from '@nestjs/swagger';

export class UserAddressResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nguyen Van B' })
  receiverName: string;

  @ApiProperty({ example: '0912345678' })
  receiverPhone: string;

  @ApiProperty({ example: 'Số 1, Đường 2, Phường 3, Quận 4, TP.HCM' })
  detailAddress: string;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: 'uuid-of-user' })
  userId: string;

  @ApiProperty()
  createdAt: Date;
}
