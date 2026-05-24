import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ChartType {
  MONTH = 'MONTH', // Doanh thu theo các ngày trong tháng hiện tại
  YEAR = 'YEAR',   // Doanh thu theo các tháng trong năm hiện tại
}

export class GetChartRequestDto {
  @ApiProperty({
    enum: ChartType,
    description: 'Loại biểu đồ doanh thu: MONTH (Ngày trong tháng), YEAR (Tháng trong năm)',
    example: ChartType.MONTH,
  })
  @IsEnum(ChartType)
  @IsNotEmpty()
  type: ChartType;
}
