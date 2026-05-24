import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import dayjs from 'dayjs';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrderStatus } from '../../common/enums/order.enum';
import { GetKpiRequestDto, StatisticPeriod } from './dto/request/get-kpi.request.dto';
import { KpiResponseDto, KpiCardData } from './dto/response/kpi.response.dto';
import { ChartType, GetChartRequestDto } from './dto/request/get-chart.request.dto';
import { ChartDataDto, OrderStatusChartDto } from './dto/response/chart.response.dto';
import { TopProductResponseDto } from './dto/response/top-product.response.dto';
import { LowStockResponseDto } from './dto/response/low-stock.response.dto';
import { TopCustomerResponseDto } from './dto/response/top-customer.response.dto';
import { UserStatisticsResponseDto } from './dto/response/user-statistics.response.dto';
import { ProductDetailEntity } from '../products/entities/product-detail.entity';

@Injectable()
export class StatisticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getKpi(dto: GetKpiRequestDto): Promise<KpiResponseDto> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.getTimeRange(dto.period);

    const [
      currentRevenue, previousRevenue,
      currentOrders, previousOrders,
      currentCustomers, previousCustomers
    ] = await Promise.all([
      this.getRevenue(currentStart, currentEnd),
      this.getRevenue(previousStart, previousEnd),
      this.getOrdersCount(currentStart, currentEnd),
      this.getOrdersCount(previousStart, previousEnd),
      this.getCustomersCount(currentStart, currentEnd),
      this.getCustomersCount(previousStart, previousEnd),
    ]);

    return {
      revenue: this.buildKpiCard(currentRevenue, previousRevenue),
      orders: this.buildKpiCard(currentOrders, previousOrders),
      customers: this.buildKpiCard(currentCustomers, previousCustomers),
    };
  }

  private getTimeRange(period: StatisticPeriod) {
    const now = dayjs();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (period) {
      case StatisticPeriod.DAY:
        currentStart = now.startOf('day').toDate();
        currentEnd = now.endOf('day').toDate();
        previousStart = now.subtract(1, 'day').startOf('day').toDate();
        previousEnd = now.subtract(1, 'day').endOf('day').toDate();
        break;
      case StatisticPeriod.WEEK:
        // Lưu ý: dayjs startOf('week') mặc định là Chủ nhật.
        currentStart = now.startOf('week').toDate();
        currentEnd = now.endOf('week').toDate();
        previousStart = now.subtract(1, 'week').startOf('week').toDate();
        previousEnd = now.subtract(1, 'week').endOf('week').toDate();
        break;
      case StatisticPeriod.MONTH:
        currentStart = now.startOf('month').toDate();
        currentEnd = now.endOf('month').toDate();
        previousStart = now.subtract(1, 'month').startOf('month').toDate();
        previousEnd = now.subtract(1, 'month').endOf('month').toDate();
        break;
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  private async getRevenue(start: Date, end: Date): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .getRawOne();
      
    return Number(result?.total || 0);
  }

  private async getOrdersCount(start: Date, end: Date): Promise<number> {
    return this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .getCount();
  }

  private async getCustomersCount(start: Date, end: Date): Promise<number> {
    return this.dataSource
      .createQueryBuilder(UserEntity, 'user')
      .where('user.roleId = :roleId', { roleId: 2 }) // 2 = USER
      .andWhere('user.createdAt BETWEEN :start AND :end', { start, end })
      .getCount();
  }

  private buildKpiCard(current: number, previous: number): KpiCardData {
    let percentageChange = 0;
    let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';

    if (previous === 0) {
      if (current > 0) {
        percentageChange = 100;
        trend = 'UP';
      }
    } else {
      const change = ((current - previous) / previous) * 100;
      percentageChange = Math.round(Math.abs(change) * 100) / 100; // Làm tròn 2 chữ số thập phân
      if (change > 0) trend = 'UP';
      else if (change < 0) trend = 'DOWN';
    }

    return {
      value: current,
      previousValue: previous,
      percentageChange,
      trend,
    };
  }

  async getRevenueChart(dto: GetChartRequestDto): Promise<ChartDataDto[]> {
    const now = dayjs();
    let startDate: Date;
    let endDate: Date;
    let groupByFormat: string;
    let selectFormat: string;

    if (dto.type === ChartType.MONTH) {
      startDate = now.startOf('month').toDate();
      endDate = now.endOf('month').toDate();
      // MySQL DATE_FORMAT for day: '%d/%m'
      groupByFormat = "DATE_FORMAT(order.createdAt, '%d/%m')";
      selectFormat = groupByFormat;
    } else {
      startDate = now.startOf('year').toDate();
      endDate = now.endOf('year').toDate();
      // MySQL DATE_FORMAT for month: '%m/%Y'
      groupByFormat = "DATE_FORMAT(order.createdAt, '%m/%Y')";
      selectFormat = groupByFormat;
    }

    const results = await this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .select(selectFormat, 'label')
      .addSelect('SUM(order.totalAmount)', 'value')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('label')
      .orderBy('MAX(order.createdAt)', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      label: row.label,
      value: Number(row.value || 0),
    }));
  }

  async getOrderStatusChart(): Promise<OrderStatusChartDto[]> {
    const startDate = dayjs().subtract(30, 'day').startOf('day').toDate();
    const endDate = dayjs().endOf('day').toDate();

    const results = await this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('order.status')
      .getRawMany();

    return results.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async getTopProducts(limit: number = 5): Promise<TopProductResponseDto[]> {
    const results = await this.dataSource.manager
      .createQueryBuilder()
      .select('p.id', 'productId')
      .addSelect('MAX(p.name)', 'productName')
      .addSelect('SUM(od.quantity)', 'totalSold')
      .addSelect('SUM(od.quantity * od.price_at_purchase)', 'revenue')
      .from('order_details', 'od')
      .innerJoin('orders', 'o', 'o.id = od.order_id')
      .innerJoin('product_details', 'pd', 'pd.id = od.product_detail_id')
      .innerJoin('products', 'p', 'p.id = pd.product_id')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .groupBy('p.id')
      .orderBy('totalSold', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      totalSold: Number(row.totalSold),
      revenue: Number(row.revenue),
    }));
  }

  async getLowStock(
    threshold: number = 10,
    limit: number = 10,
  ): Promise<LowStockResponseDto[]> {
    const results = await this.dataSource
      .createQueryBuilder(ProductDetailEntity, 'pd')
      .select('p.id', 'productId')
      .addSelect('pd.id', 'productDetailId')
      .addSelect('p.name', 'productName')
      .addSelect('pd.color', 'color')
      .addSelect('pd.size', 'size')
      .addSelect('pd.stock', 'stock')
      .innerJoin('pd.product', 'p')
      .where('pd.stock < :threshold', { threshold })
      .orderBy('pd.stock', 'ASC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      productId: row.productId,
      productDetailId: row.productDetailId,
      productName: row.productName,
      color: row.color,
      size: row.size,
      stock: Number(row.stock),
    }));
  }

  async getTopCustomers(limit: number = 5): Promise<TopCustomerResponseDto[]> {
    const results = await this.dataSource.manager
      .createQueryBuilder()
      .select('u.id', 'userId')
      .addSelect('MAX(u.full_name)', 'fullName')
      .addSelect('MAX(u.email)', 'email')
      .addSelect('MAX(u.avatar_url)', 'avatarUrl')
      .addSelect('SUM(o.total_amount)', 'totalSpent')
      .addSelect('COUNT(o.id)', 'totalOrders')
      .from('orders', 'o')
      .innerJoin('users', 'u', 'u.id = o.user_id')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .groupBy('u.id')
      .orderBy('totalSpent', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      userId: row.userId,
      fullName: row.fullName,
      email: row.email,
      avatarUrl: row.avatarUrl || '',
      totalSpent: Number(row.totalSpent),
      totalOrders: Number(row.totalOrders),
    }));
  }

  async getUserStatistics(userId: string): Promise<UserStatisticsResponseDto> {
    const now = dayjs();
    const monthStart = now.startOf('month').toDate();
    const monthEnd = now.endOf('month').toDate();
    const yearStart = now.startOf('year').toDate();
    const yearEnd = now.endOf('year').toDate();

    const monthResult = await this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
      .getRawOne();
    const totalSpentMonth = Number(monthResult?.total || 0);

    const yearResult = await this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: yearStart, end: yearEnd })
      .getRawOne();
    const totalSpentYear = Number(yearResult?.total || 0);

    const statusCounts = await this.dataSource
      .createQueryBuilder(OrderEntity, 'order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.userId = :userId', { userId })
      .groupBy('order.status')
      .getRawMany();

    let ordersCompleted = 0;
    let ordersPending = 0;
    let ordersShipping = 0;

    for (const row of statusCounts) {
      const count = Number(row.count);
      if (row.status === OrderStatus.COMPLETED) {
        ordersCompleted += count;
      } else if (row.status === OrderStatus.PENDING || row.status === OrderStatus.CONFIRMED) {
        ordersPending += count;
      } else if (row.status === OrderStatus.SHIPPING) {
        ordersShipping += count;
      }
    }

    return {
      totalSpentMonth,
      totalSpentYear,
      ordersCompleted,
      ordersPending,
      ordersShipping,
    };
  }
}
