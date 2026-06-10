import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum SalesReportGroupBy {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export class GetSalesReportRequestDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: SalesReportGroupBy, description: 'Tự động xác định nếu không truyền' })
  @IsOptional()
  @IsEnum(SalesReportGroupBy)
  groupBy?: SalesReportGroupBy;
}
