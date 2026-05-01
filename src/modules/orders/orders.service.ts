import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderDetailEntity } from './entities/order-detail.entity';
import { ProductDetailEntity } from '../products/entities/product-detail.entity';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';

@Injectable()
export class OrdersService {
  constructor(private readonly dataSource: DataSource) {}

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderDetails: OrderDetailEntity[] = [];

      // Tuyệt đối KHÔNG sử dụng Promise.all. Xử lý tuần tự bằng for...of
      for (const item of createOrderDto.items) {
        // Tìm ProductDetail (Có sử dụng Pessimistic Write Lock để chống Race Condition khi concurrent booking)
        const productDetail = await queryRunner.manager.findOne(
          ProductDetailEntity,
          {
            where: { id: item.product_detail_id },
            lock: { mode: 'pessimistic_write' }, //pessimistic_write có tác dụng như thế nào , đó là khóa dữ liệu  của cột product_detail_entity
          },
        );

        if (!productDetail) {
          throw new NotFoundException(
            `Sản phẩm với ID ${item.product_detail_id} không tồn tại`,
          );
        }

        if (productDetail.stock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${item.product_detail_id} không đủ số lượng (Còn: ${productDetail.stock})`,
          );
        }

        // Tính tổng tiền
        const price = Number(productDetail.price);
        totalAmount += price * item.quantity;

        // Trừ stock và lưu tuần tự
        productDetail.stock -= item.quantity;
        await queryRunner.manager.save(ProductDetailEntity, productDetail);

        // Tạo OrderDetail tạm
        const orderDetail = new OrderDetailEntity();
        orderDetail.productDetailId = productDetail.id;
        orderDetail.quantity = item.quantity;
        orderDetail.priceAtPurchase = price;
        orderDetails.push(orderDetail);
      }

      // Khởi tạo Order
      const order = new OrderEntity();
      order.userId = userId;
      order.totalAmount = totalAmount;
      order.paymentMethod = createOrderDto.payment_method;
      order.receiverName = createOrderDto.name;
      order.receiverPhone = createOrderDto.phone;
      order.deliveryAddress = createOrderDto.address;
      order.status = OrderStatus.PENDING;
      order.paymentStatus = PaymentStatus.UNPAID;

      // Lưu Order
      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      // Gán order_id và lưu toàn bộ OrderDetail
      for (const detail of orderDetails) {
        detail.orderId = savedOrder.id;
      }
      await queryRunner.manager.save(OrderDetailEntity, orderDetails);

      await queryRunner.commitTransaction();

      return (await this.dataSource.manager.findOne(OrderEntity, {
        where: { id: savedOrder.id },
        relations: { orderDetails: true },
      })) as OrderEntity;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentStatus: PaymentStatus,
  ): Promise<OrderEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(OrderEntity, {
        where: { id: orderId },
        relations: { orderDetails: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      // Kiểm tra xem trạng thái cũ khác CANCELLED và trạng thái mới chuyển sang CANCELLED
      const isCancelling =
        order.status !== OrderStatus.CANCELLED &&
        status === OrderStatus.CANCELLED;

      order.status = status;
      order.paymentStatus = paymentStatus;

      // Bắt buộc xử lý tuần tự hoàn tồn kho
      if (isCancelling && order.orderDetails) {
        for (const detail of order.orderDetails) {
          const productDetail = await queryRunner.manager.findOne(
            ProductDetailEntity,
            {
              where: { id: detail.productDetailId },
              lock: { mode: 'pessimistic_write' },
            },
          );

          if (productDetail) {
            productDetail.stock += detail.quantity; // CỘNG LẠI TỒN KHO
            await queryRunner.manager.save(ProductDetailEntity, productDetail);
          }
        }
      }

      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      await queryRunner.commitTransaction();

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
