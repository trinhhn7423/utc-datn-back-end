import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { StatisticsService } from './statistics.service';
import { GetKpiRequestDto } from './dto/request/get-kpi.request.dto';
import { KpiResponseDto } from './dto/response/kpi.response.dto';
import { GetChartRequestDto } from './dto/request/get-chart.request.dto';
import {
  ChartDataDto,
  OrderStatusChartDto,
} from './dto/response/chart.response.dto';
import { TopProductResponseDto } from './dto/response/top-product.response.dto';
import { LowStockResponseDto } from './dto/response/low-stock.response.dto';
import { TopCustomerResponseDto } from './dto/response/top-customer.response.dto';
import { UserStatisticsResponseDto } from './dto/response/user-statistics.response.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { BaseResponse } from '../../core/base/base.response';
import { GetSalesReportRequestDto } from './dto/request/get-sales-report.request.dto';
import { SalesReportItemDto } from './dto/response/sales-report.response.dto';
import { CategoryDistributionDto } from './dto/response/category-distribution.response.dto';
import { CustomerLoyaltyDto } from './dto/response/customer-loyalty.response.dto';
import type { Response } from 'express';

@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Roles(RoleEnum.ADMIN)
  @Get('kpi')
  @ApiOperation({ summary: 'Lấy số liệu thống kê tổng quan (Admin)' })
  @ApiResponse({ status: 200, type: BaseResponse<KpiResponseDto> })
  async getKpi(
    @Query() dto: GetKpiRequestDto,
  ): Promise<BaseResponse<KpiResponseDto>> {
    const data = await this.statisticsService.getKpi(dto);
    return new BaseResponse(200, 'Lấy số liệu thống kê thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('revenue-chart')
  @ApiOperation({ summary: 'Biểu đồ doanh thu theo thời gian' })
  @ApiResponse({ status: 200, type: BaseResponse<ChartDataDto[]> })
  async getRevenueChart(
    @Query() dto: GetChartRequestDto,
  ): Promise<BaseResponse<ChartDataDto[]>> {
    const data = await this.statisticsService.getRevenueChart(dto);
    return new BaseResponse(200, 'Lấy biểu đồ doanh thu thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('order-status-chart')
  @ApiOperation({ summary: 'Biểu đồ tình trạng đơn hàng (30 ngày gần nhất)' })
  @ApiResponse({ status: 200, type: BaseResponse<OrderStatusChartDto[]> })
  async getOrderStatusChart(): Promise<BaseResponse<OrderStatusChartDto[]>> {
    const data = await this.statisticsService.getOrderStatusChart();
    return new BaseResponse(200, 'Lấy biểu đồ đơn hàng thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('top-products')
  @ApiOperation({ summary: 'Sản phẩm bán chạy nhất' })
  @ApiResponse({ status: 200, type: BaseResponse<TopProductResponseDto[]> })
  async getTopProducts(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<BaseResponse<TopProductResponseDto[]>> {
    const data = await this.statisticsService.getTopProducts(limit);
    return new BaseResponse(200, 'Lấy sản phẩm bán chạy thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('low-stock')
  @ApiOperation({ summary: 'Cảnh báo sản phẩm sắp hết hàng' })
  @ApiResponse({ status: 200, type: BaseResponse<LowStockResponseDto[]> })
  async getLowStock(
    @Query('threshold', new DefaultValuePipe(10), ParseIntPipe)
    threshold: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<BaseResponse<LowStockResponseDto[]>> {
    const data = await this.statisticsService.getLowStock(threshold, limit);
    return new BaseResponse(200, 'Lấy cảnh báo tồn kho thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('top-customers')
  @ApiOperation({ summary: 'Khách hàng chi tiêu nhiều nhất' })
  @ApiResponse({ status: 200, type: BaseResponse<TopCustomerResponseDto[]> })
  async getTopCustomers(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<BaseResponse<TopCustomerResponseDto[]>> {
    const data = await this.statisticsService.getTopCustomers(limit);
    return new BaseResponse(200, 'Lấy top khách hàng thành công', data);
  }

  // API dành cho cả User và Admin để xem thống kê của chính họ
  @Get('me')
  @ApiOperation({ summary: 'Thống kê chi tiêu và đơn hàng (Dành cho User)' })
  @ApiResponse({ status: 200, type: BaseResponse<UserStatisticsResponseDto> })
  async getUserStatistics(
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<UserStatisticsResponseDto>> {
    const data = await this.statisticsService.getUserStatistics(userId);
    return new BaseResponse(200, 'Lấy thống kê cá nhân thành công', data);
  }

  // ─── PHASE 1: NEW ANALYTICS ENDPOINTS ────────────────────────────────────────

  @Roles(RoleEnum.ADMIN)
  @Get('sales-report')
  @ApiOperation({ summary: 'Báo cáo doanh số theo khoảng thời gian tùy chọn' })
  @ApiResponse({ status: 200, type: BaseResponse<SalesReportItemDto[]> })
  async getSalesReport(
    @Query() dto: GetSalesReportRequestDto,
  ): Promise<BaseResponse<SalesReportItemDto[]>> {
    const data = await this.statisticsService.getSalesReport(dto);
    return new BaseResponse(200, 'Lấy báo cáo doanh số thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('category-distribution')
  @ApiOperation({ summary: 'Tỷ trọng doanh thu theo danh mục sản phẩm' })
  @ApiResponse({ status: 200, type: BaseResponse<CategoryDistributionDto[]> })
  async getCategoryDistribution(): Promise<BaseResponse<CategoryDistributionDto[]>> {
    const data = await this.statisticsService.getCategoryDistribution();
    return new BaseResponse(200, 'Lấy tỷ trọng danh mục thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('customer-loyalty')
  @ApiOperation({ summary: 'Tỷ lệ khách hàng mới vs khách hàng quay lại' })
  @ApiResponse({ status: 200, type: BaseResponse<CustomerLoyaltyDto> })
  async getCustomerLoyalty(): Promise<BaseResponse<CustomerLoyaltyDto>> {
    const data = await this.statisticsService.getCustomerLoyalty();
    return new BaseResponse(200, 'Lấy tỷ lệ khách hàng thành công', data);
  }

  @Roles(RoleEnum.ADMIN)
  @Get('export/sales')
  @ApiOperation({ summary: 'Xuất báo cáo doanh số ra file Excel (.xlsx)' })
  async exportSalesExcel(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.statisticsService.exportSalesReportExcel(startDate, endDate);
    const filename = `bao-cao-doanh-so-${startDate}-${endDate}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
