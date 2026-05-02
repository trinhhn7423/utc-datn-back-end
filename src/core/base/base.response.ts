import { ApiProperty } from '@nestjs/swagger';

export class BaseResponse<T> {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

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
    this.data = data;
    this.totalElement = totalElement;
  }
}
