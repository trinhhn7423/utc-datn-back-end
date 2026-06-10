import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiPropertyOptional({ description: 'Filter by roleId' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roleId?: number;
}
