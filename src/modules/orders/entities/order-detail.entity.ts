import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { ProductDetailEntity } from '../../products/entities/product-detail.entity';

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
  priceAtPurchase: number;
}
