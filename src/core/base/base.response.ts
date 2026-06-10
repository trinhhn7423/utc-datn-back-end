import { ApiProperty } from '@nestjs/swagger';

export class BaseResponse<T> {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty()
  totalElement?: number;

  constructor(
    statusCode: number,
    message: string,
    data: T,
    totalElement?: number,
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.success = true;
    this.data = data;
    this.totalElement = totalElement;
  }
}
