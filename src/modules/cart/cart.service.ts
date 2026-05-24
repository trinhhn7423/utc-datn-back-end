import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { CartItemEntity } from './entities/cart-item.entity';
import { ProductDetailEntity } from '../products/entities/product-detail.entity';
import { AddToCartDto } from './dto/request/add-to-cart.dto';
import { UpdateCartDto } from './dto/request/update-cart.dto';
import {
  CartResponseDto,
  CartItemResponseDto,
} from './dto/response/cart.response.dto';
import { CartCountResponseDto } from './dto/response/cart-count.response.dto';
import { CartItemRepository } from './repositories/cart-item.repository';
import { ProductDetailRepository } from '../products/repositories/product-detail.repository';

@Injectable()
export class CartService {
  constructor(
    private readonly cartItemRepository: CartItemRepository,
    private readonly productDetailRepository: ProductDetailRepository,
  ) {}

  async add(userId: string, dto: AddToCartDto): Promise<void> {
    const productDetail = await this.productDetailRepository.findOne({
      where: { id: dto.productDetailId },
      relations: { product: true },
    });

    if (!productDetail) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    if (productDetail.product && productDetail.product.isPublished === false) {
      throw new BadRequestException('Sản phẩm đã ngừng bán');
    }

    if (productDetail.stock < dto.quantity) {
      throw new BadRequestException('Số lượng yêu cầu vượt quá tồn kho');
    }

    const existingItem = await this.cartItemRepository.findOne({
      where: { userId, productDetailId: dto.productDetailId },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      if (newQuantity > productDetail.stock) {
        throw new BadRequestException(
          'Tổng số lượng trong giỏ hàng vượt quá tồn kho',
        );
      }
      existingItem.update(newQuantity);
      await this.cartItemRepository.save(existingItem);
    } else {
      const newItem = CartItemEntity.create(
        userId,
        dto.productDetailId,
        dto.quantity,
      );
      await this.cartItemRepository.save(newItem);
    }
  }

  async update(
    userId: string,
    cartItemId: number,
    dto: UpdateCartDto,
  ): Promise<void> {
    const item = await this.cartItemRepository.findOne({
      where: { id: cartItemId, userId },
      relations: { productDetail: { product: true } },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm trong giỏ không tồn tại');
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Số lượng cập nhật phải lớn hơn 0');
    }

    if (
      item.productDetail &&
      item.productDetail.product &&
      item.productDetail.product.isPublished === false
    ) {
      throw new BadRequestException('Sản phẩm đã ngừng bán');
    }

    if (dto.quantity > item.productDetail.stock) {
      throw new BadRequestException('Số lượng cập nhật vượt quá tồn kho');
    }

    item.update(dto.quantity);
    await this.cartItemRepository.save(item);
  }

  async remove(userId: string, cartItemId: number): Promise<void> {
    const item = await this.cartItemRepository.findOne({
      where: { id: cartItemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Sản phẩm trong giỏ không tồn tại');
    }

    item.markAsDeleted();
    await this.cartItemRepository.save(item);
  }

  async removeMultiple(userId: string, cartItemIds: number[]): Promise<void> {
    if (cartItemIds.length === 0) return;

    await this.cartItemRepository
      .createQueryBuilder()
      .softDelete()
      .from(CartItemEntity)
      .where('userId = :userId', { userId })
      .andWhere('id IN (:...ids)', { ids: cartItemIds })
      .execute();
  }

  async getCart(userId: string, ids?: number[]): Promise<CartResponseDto> {
    const whereCondition: FindOptionsWhere<CartItemEntity> = {
      userId,
      deletedAt: IsNull(),
    };
    if (ids && ids.length > 0) {
      whereCondition.id = In(ids);
    }

    const cartItems = await this.cartItemRepository.find({
      where: whereCondition,
      relations: {
        productDetail: {
          product: {
            images: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const items: CartItemResponseDto[] = cartItems.map((item) =>
      item.toResponse(),
    );

    const cartTotal = items.reduce((sum, item) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);

    const response = new CartResponseDto();
    response.items = items;
    response.cartTotal = cartTotal;
    return response;
  }

  async getCartCount(userId: string): Promise<CartCountResponseDto> {
    const result = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .select('SUM(cartItem.quantity)', 'sum')
      .where('cartItem.userId = :userId', { userId })
      .getRawOne();

    const count = result && result.sum ? parseInt(result.sum, 10) : 0;

    const response = new CartCountResponseDto();
    response.count = count;
    return response;
  }
}
