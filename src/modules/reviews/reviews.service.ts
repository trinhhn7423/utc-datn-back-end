import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { CreateReviewDto } from './dto/request/create-review.dto';
import { ReviewEntity } from './entities/review.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderDetailEntity } from '../orders/entities/order-detail.entity';
import { OrderStatus } from '../../common/enums/order.enum';
import { ReviewFilterRequestDto } from './dto/request/review-filter.request.dto';
import { ReviewRepository } from './repositories/review.repository';
import { UnreviewedItemResponseDto } from './dto/response/unreviewed-item.response.dto';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductImageEntity } from '../products/entities/product-image.entity';
import { ProductDetailEntity } from '../products/entities/product-detail.entity';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reviewRepository: ReviewRepository,
  ) {}

  async getUnreviewedItems(userId: string): Promise<UnreviewedItemResponseDto[]> {
    const orderDetails = await this.dataSource
      .getRepository(OrderDetailEntity)
      .createQueryBuilder('orderDetail')
      .innerJoinAndSelect('orderDetail.order', 'order')
      .innerJoinAndSelect('orderDetail.productDetail', 'productDetail')
      .innerJoinAndSelect('productDetail.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoin(
        ReviewEntity,
        'review',
        'review.orderId = order.id AND review.productId = productDetail.productId AND review.userId = :userId',
        { userId },
      )
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('review.id IS NULL')
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    return orderDetails.map((detail) => {
      const dto = new UnreviewedItemResponseDto();
      dto.orderId = detail.orderId;
      dto.productId = detail.productDetail.productId;
      dto.productName = detail.productDetail.product.name;

      if (
        detail.productDetail.product.images &&
        detail.productDetail.product.images.length > 0
      ) {
        const thumbnail = detail.productDetail.product.images.find(
          (img) => img.isThumbnail,
        );
        dto.productThumbnail = thumbnail
          ? thumbnail.imageUrl
          : detail.productDetail.product.images[0].imageUrl;
      }

      dto.color = detail.productDetail.color;
      dto.size = detail.productDetail.size;
      dto.priceAtPurchase = Number(detail.priceAtPurchase);
      dto.quantity = detail.quantity;
      dto.orderCreatedAt = detail.order.createdAt;
      return dto;
    });
  }

  async getMyReviews(userId: string): Promise<any[]> {
    const reviews = await this.dataSource.manager
      .createQueryBuilder(ReviewEntity, 'review')
      .innerJoin(ProductEntity, 'product', 'product.id = review.productId')
      .leftJoin(
        ProductImageEntity,
        'image',
        'image.productId = product.id AND image.isThumbnail = true',
      )
      .innerJoin(
        OrderDetailEntity,
        'orderDetail',
        'orderDetail.orderId = review.orderId',
      )
      .innerJoin(
        ProductDetailEntity,
        'productDetail',
        'productDetail.id = orderDetail.productDetailId AND productDetail.productId = review.productId',
      )
      .where('review.userId = :userId', { userId })
      .orderBy('review.createdAt', 'DESC')
      .select([
        'review.id as id',
        'review.rating as rating',
        'review.comment as comment',
        'review.createdAt as createdAt',
        'product.id as productId',
        'product.name as productName',
        'image.imageUrl as productThumbnail',
        'productDetail.color as color',
        'productDetail.size as size',
      ])
      .getRawMany();

    return reviews.map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      comment: row.comment || '',
      createdAt: row.createdAt,
      productId: row.productId,
      productName: row.productName,
      productThumbnail: row.productThumbnail || null,
      color: row.color || '',
      size: row.size || '',
    }));
  }

  async createReview(
    userId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    const { productId, orderId, rating, comment } = createReviewDto;

    // Kiểm tra xem đơn hàng có tồn tại và thuộc về user này không
    const order = await this.dataSource.manager.findOne(OrderEntity, {
      where: { id: orderId, userId },
      relations: { orderDetails: { productDetail: true } },
    });

    if (!order) {
      throw new BadRequestException(
        'Đơn hàng không tồn tại hoặc không thuộc về người dùng này',
      );
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá khi đơn hàng đã được giao thành công (COMPLETED)',
      );
    }

    // Kiểm tra xem trong đơn hàng có sản phẩm này không
    const hasProduct = order.orderDetails.some(
      (detail) => detail.productDetail.productId === productId,
    );
    if (!hasProduct) {
      throw new BadRequestException(
        'Sản phẩm này không nằm trong đơn hàng đã chọn',
      );
    }

    // Kiểm tra xem đã đánh giá chưa
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, productId, orderId },
    });

    if (existingReview) {
      throw new BadRequestException(
        'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi',
      );
    }

    const review = new ReviewEntity();
    review.init(userId, productId, orderId, rating, comment);

    return this.reviewRepository.save(review);
  }

  async findAll(
    filterDto: ReviewFilterRequestDto,
  ): Promise<[ReviewEntity[], number]> {
    const { page = 1, size = 10, productId, rating } = filterDto;
    const skip = (page - 1) * size;
    const where: FindOptionsWhere<ReviewEntity> = {};

    if (productId) {
      where.productId = productId;
    }

    if (rating) {
      where.rating = rating;
    }

    return this.reviewRepository.findAndCount({
      where,
      skip,
      take: size,
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
