import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BasePaginationRequestDto } from 'src/core/base/base.pagination.request';

export class UserFilterRequestDto extends BasePaginationRequestDto {
  @ApiPropertyOptional({ description: 'Filter by email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by fullName' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
