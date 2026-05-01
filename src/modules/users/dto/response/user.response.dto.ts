import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-411d-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  full_name: string;

  @ApiProperty({ example: 'abc@gmail.com' })
  email: string;

  @ApiProperty({ example: '0987654321' })
  phone?: string;

  @ApiProperty({ example: 'Hanoi, Vietnam' })
  address?: string;

  @ApiProperty({ example: 1 })
  role_id: number;

  @ApiProperty()
  created_at: Date;
}
