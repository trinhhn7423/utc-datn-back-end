import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAddressResponseDto } from 'src/modules/user-addresses/dto/response/user-address.response.dto';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-411d-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName: string;

  @ApiProperty({ example: 'abc@gmail.com' })
  email: string;

  @ApiProperty({ example: 1 })
  roleId: number;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;

  @ApiPropertyOptional({ type: [UserAddressResponseDto] })
  addresses?: UserAddressResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ example: 0 })
  viewsCount: number;
}
