import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { ProductDetailEntity } from '../../products/entities/product-detail.entity';
import { OrderDetailResponseDto, ProductDetailInOrderDto } from '../dto/response/order-detail.response.dto';

@Entity('order_details')
export class OrderDetailEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => OrderEntity, (order) => order.orderDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @Column({ name: 'product_detail_id' })
  productDetailId: number;

  @ManyToOne(() => ProductDetailEntity)
  @JoinColumn({ name: 'product_detail_id' })
  productDetail: ProductDetailEntity;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price_at_purchase' })
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price_at_purchase' })
  priceAtPurchase: number;

  static create(productDetailId: number, quantity: number, price: number): OrderDetailEntity {
    const detail = new OrderDetailEntity();
    detail.productDetailId = productDetailId;
    detail.quantity = quantity;
    detail.priceAtPurchase = price;
    return detail;
  }

  toResponse(): OrderDetailResponseDto {
    const dto = new OrderDetailResponseDto();
    dto.id = this.id;
    dto.productDetailId = this.productDetailId;
    dto.quantity = this.quantity;
    dto.priceAtPurchase = Number(this.priceAtPurchase);

    if (this.productDetail) {
      const pdDto = new ProductDetailInOrderDto();
      pdDto.color = this.productDetail.color;
      pdDto.size = this.productDetail.size;
      pdDto.price = this.productDetail.price.toString();
      pdDto.stock = this.productDetail.stock;

      if (this.productDetail.product) {
        pdDto.productName = this.productDetail.product.name;
        if (this.productDetail.product.images && this.productDetail.product.images.length > 0) {
          const thumbnail = this.productDetail.product.images.find(img => img.isThumbnail);
          pdDto.productThumbnail = thumbnail ? thumbnail.imageUrl : this.productDetail.product.images[0].imageUrl;
        }
      }

      dto.productDetail = pdDto;
    }

    return dto;
  }
}
