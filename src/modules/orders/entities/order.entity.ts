import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { PaymentMethod, PaymentStatus, OrderStatus } from '../../../common/enums/order.enum';
import { OrderDetailEntity } from './order-detail.entity';
import { OrderResponseDto } from '../dto/response/order.response.dto';

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID, name: 'payment_status' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'json', name: 'shipping_address' })
  shippingAddress: ShippingAddress;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrderDetailEntity, (detail) => detail.order, { cascade: true })
  orderDetails: OrderDetailEntity[];

  static create(
    userId: string,
    totalAmount: number,
    paymentMethod: PaymentMethod,
    shippingAddress: ShippingAddress,
    orderDetails: OrderDetailEntity[]
  ): OrderEntity {
    const order = new OrderEntity();
    order.userId = userId;
    order.totalAmount = totalAmount;
    order.paymentMethod = paymentMethod;
    order.shippingAddress = shippingAddress;
    order.status = OrderStatus.PENDING;
    order.paymentStatus = PaymentStatus.UNPAID;
    order.orderDetails = orderDetails;
    return order;
  }

  toResponse(): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = this.id;
    dto.userId = this.userId;
    dto.totalAmount = Number(this.totalAmount);
    dto.paymentMethod = this.paymentMethod;
    dto.paymentStatus = this.paymentStatus;
    dto.status = this.status;
    dto.shippingAddress = this.shippingAddress;
    dto.createdAt = this.createdAt;
    
    if (this.orderDetails) {
      dto.orderDetails = this.orderDetails.map(detail => detail.toResponse());
    }
    return dto;
  }
}
