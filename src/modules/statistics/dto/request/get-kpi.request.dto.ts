import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum StatisticPeriod {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export class GetKpiRequestDto {
  @ApiProperty({
    enum: StatisticPeriod,
    description: 'Khoảng thời gian thống kê: DAY (Hôm nay), WEEK (Tuần này), MONTH (Tháng này)',
    example: StatisticPeriod.MONTH,
  })
  @IsEnum(StatisticPeriod)
  @IsNotEmpty()
  period: StatisticPeriod;
}
