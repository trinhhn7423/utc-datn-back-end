import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { BasePaginationRequestDto } from 'src/core/base/base.pagination.request';

export class GetNotificationsRequestDto extends BasePaginationRequestDto {}
