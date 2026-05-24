export class UserStatisticsResponseDto {
  totalSpentMonth: number;
  totalSpentYear: number;
  ordersCompleted: number;
  ordersPending: number; // PENDING + CONFIRMED
  ordersShipping: number; // SHIPPING
}
