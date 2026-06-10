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
import { GetSalesReportRequestDto, SalesReportGroupBy } from './dto/request/get-sales-report.request.dto';
import { SalesReportItemDto } from './dto/response/sales-report.response.dto';
import { CategoryDistributionDto } from './dto/response/category-distribution.response.dto';
import { CustomerLoyaltyDto } from './dto/response/customer-loyalty.response.dto';
import * as ExcelJS from 'exceljs';

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

  // ─── PHASE 1: NEW ANALYTICS METHODS ────────────────────────────────────────

  async getSalesReport(dto: GetSalesReportRequestDto): Promise<SalesReportItemDto[]> {
    const startDate = dayjs(dto.startDate).startOf('day').toDate();
    const endDate = dayjs(dto.endDate).endOf('day').toDate();

    // Auto-detect groupBy based on date range
    const diffDays = dayjs(dto.endDate).diff(dayjs(dto.startDate), 'day');
    let groupBy = dto.groupBy;
    if (!groupBy) {
      if (diffDays <= 31) groupBy = SalesReportGroupBy.DAY;
      else if (diffDays <= 90) groupBy = SalesReportGroupBy.WEEK;
      else groupBy = SalesReportGroupBy.MONTH;
    }

    let groupByFormat: string;
    switch (groupBy) {
      case SalesReportGroupBy.DAY:
        groupByFormat = "DATE_FORMAT(o.createdAt, '%d/%m')"; break;
      case SalesReportGroupBy.WEEK:
        groupByFormat = "CONCAT('Tuần ', WEEK(o.createdAt, 1), '/', YEAR(o.createdAt))"; break;
      case SalesReportGroupBy.MONTH:
      default:
        groupByFormat = "DATE_FORMAT(o.createdAt, '%m/%Y')"; break;
    }

    const results = await this.dataSource
      .createQueryBuilder(OrderEntity, 'o')
      .select(groupByFormat, 'label')
      .addSelect('SUM(CASE WHEN o.status = :completed THEN o.totalAmount ELSE 0 END)', 'revenue')
      .addSelect('COUNT(o.id)', 'orderCount')
      .where('o.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .setParameter('completed', OrderStatus.COMPLETED)
      .groupBy('label')
      .orderBy('MIN(o.createdAt)', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      label: row.label,
      revenue: Number(row.revenue || 0),
      orderCount: Number(row.orderCount || 0),
    }));
  }

  async getCategoryDistribution(): Promise<CategoryDistributionDto[]> {
    const results = await this.dataSource.manager
      .createQueryBuilder()
      .select('c.id', 'categoryId')
      .addSelect('MAX(c.name)', 'categoryName')
      .addSelect('SUM(od.quantity * od.price_at_purchase)', 'revenue')
      .from('orders', 'o')
      .innerJoin('order_details', 'od', 'od.order_id = o.id')
      .innerJoin('product_details', 'pd', 'pd.id = od.product_detail_id')
      .innerJoin('products', 'p', 'p.id = pd.product_id')
      .innerJoin('categories', 'c', 'c.id = p.category_id')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .groupBy('c.id')
      .orderBy('revenue', 'DESC')
      .getRawMany();

    const totalRevenue = results.reduce((sum, r) => sum + Number(r.revenue || 0), 0);

    return results.map((row) => ({
      categoryId: Number(row.categoryId),
      categoryName: row.categoryName,
      revenue: Number(row.revenue || 0),
      percentage:
        totalRevenue > 0
          ? Math.round((Number(row.revenue || 0) / totalRevenue) * 10000) / 100
          : 0,
    }));
  }

  async getCustomerLoyalty(): Promise<CustomerLoyaltyDto> {
    // New customers: exactly 1 completed order
    // Returning customers: >= 2 completed orders
    const results = await this.dataSource.manager
      .createQueryBuilder()
      .select('o.user_id', 'userId')
      .addSelect('COUNT(o.id)', 'orderCount')
      .from('orders', 'o')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .groupBy('o.user_id')
      .getRawMany();

    let newCustomersCount = 0;
    let returningCustomersCount = 0;

    for (const row of results) {
      if (Number(row.orderCount) === 1) newCustomersCount++;
      else if (Number(row.orderCount) >= 2) returningCustomersCount++;
    }

    const total = newCustomersCount + returningCustomersCount;
    const returningRate =
      total > 0 ? Math.round((returningCustomersCount / total) * 10000) / 100 : 0;

    return { newCustomersCount, returningCustomersCount, returningRate };
  }

  async exportSalesReportExcel(startDate: string, endDate: string): Promise<Buffer> {
    const data = await this.getSalesReport({ startDate, endDate });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TH-Store Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo doanh số');

    // Header row style
    sheet.columns = [
      { header: 'Thời gian', key: 'label', width: 20 },
      { header: 'Doanh thu (VND)', key: 'revenue', width: 25 },
      { header: 'Số đơn hàng', key: 'orderCount', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1677FF' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 28;

    // Data rows
    data.forEach((item) => {
      const row = sheet.addRow({
        label: item.label,
        revenue: item.revenue,
        orderCount: item.orderCount,
      });
      // Format revenue cell as number
      row.getCell('revenue').numFmt = '#,##0';
      row.getCell('orderCount').alignment = { horizontal: 'center' };
    });

    // Total row
    const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);
    const totalOrders = data.reduce((sum, r) => sum + r.orderCount, 0);
    const totalRow = sheet.addRow({ label: 'TỔNG CỘNG', revenue: totalRevenue, orderCount: totalOrders });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } };
    });
    totalRow.getCell('revenue').numFmt = '#,##0';
    totalRow.getCell('orderCount').alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
