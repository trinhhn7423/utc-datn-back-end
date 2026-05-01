import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../modules/users/dto/response/user.response.dto';

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  user: UserResponseDto;
}
