export class KpiCardData {
  value: number;
  previousValue: number;
  percentageChange: number;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
}

export class KpiResponseDto {
  revenue: KpiCardData;
  orders: KpiCardData;
  customers: KpiCardData;
}
