import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductDetailEntity } from '../../products/entities/product-detail.entity';
import { CartItemResponseDto } from '../dto/response/cart.response.dto';

@Entity('cart_items')
@Index('idx_cart_user_id', ['userId'])
export class CartItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'product_detail_id' })
  productDetailId: number;

  @ManyToOne(() => ProductDetailEntity)
  @JoinColumn({ name: 'product_detail_id' })
  productDetail: ProductDetailEntity;

  @Column({ type: 'int' })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  static create(
    userId: string,
    productDetailId: number,
    quantity: number,
  ): CartItemEntity {
    const item = new CartItemEntity();
    item.userId = userId;
    item.productDetailId = productDetailId;
    item.quantity = quantity;
    return item;
  }

  update(quantity: number): void {
    if (quantity !== undefined) {
      this.quantity = quantity;
    }
  }

  markAsDeleted(): void {
    this.deletedAt = new Date();
  }

  toResponse(): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.id = this.id;
    dto.productDetailId = this.productDetailId;
    dto.quantity = this.quantity;

    if (this.productDetail) {
      dto.color = this.productDetail.color;
      dto.size = this.productDetail.size;
      dto.price = this.productDetail.price.toString();
      dto.stock = this.productDetail.stock;

      if (this.productDetail.product) {
        dto.productId = this.productDetail.product.id;
        dto.name = this.productDetail.product.name;
        dto.isPublished = this.productDetail.product.isPublished;

        if (
          this.productDetail.product.images &&
          this.productDetail.product.images.length > 0
        ) {
          dto.thumbnail = this.productDetail.product.images.find(image => image.isThumbnail)?.imageUrl;
        }
      }
    }

    return dto;
  }
}
