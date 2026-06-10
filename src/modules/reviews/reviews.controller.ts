import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/request/create-review.dto';
import { ReviewFilterRequestDto } from './dto/request/review-filter.request.dto';
import { ReviewResponseDto } from './dto/response/review.response.dto';
import { UnreviewedItemResponseDto } from './dto/response/unreviewed-item.response.dto';
import { BaseResponse } from '../../core/base/base.response';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles(RoleEnum.USER)
  @Get('unreviewed')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm cần đánh giá (Chỉ USER)' })
  @ApiResponse({ status: 200, type: [UnreviewedItemResponseDto] })
  async getUnreviewedItems(
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<UnreviewedItemResponseDto[]>> {
    const data = await this.reviewsService.getUnreviewedItems(userId);
    return new BaseResponse(200, 'Lấy danh sách sản phẩm cần đánh giá thành công', data);
  }

  @Roles(RoleEnum.USER)
  @Get('me')
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của tôi (Chỉ USER)' })
  @ApiResponse({ status: 200 })
  async getMyReviews(
    @CurrentUser('id') userId: string,
  ): Promise<BaseResponse<any[]>> {
    const data = await this.reviewsService.getMyReviews(userId);
    return new BaseResponse(200, 'Lấy danh sách đánh giá của tôi thành công', data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đánh giá có phân trang và lọc' })
  @ApiResponse({ status: 200, type: BaseResponse<ReviewResponseDto[]> })
  async findAll(@Query() filterDto: ReviewFilterRequestDto): Promise<BaseResponse<ReviewResponseDto[]>> {
    const [reviews, totalElement] = await this.reviewsService.findAll(filterDto);
    const data = reviews.map(review => review.toResponse());
    return new BaseResponse(200, 'Lấy danh sách đánh giá thành công', data, totalElement);
  }

  @Roles(RoleEnum.USER)
  @Post()
  @ApiOperation({ summary: 'Tạo đánh giá mới cho sản phẩm (Chỉ USER)' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.createReview(userId, createReviewDto);
    return review.toResponse();
  }
}
