import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, FindOptionsWhere, In } from 'typeorm';
import * as _ from 'lodash';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderDetailEntity } from './entities/order-detail.entity';
import { ProductDetailEntity } from '../products/entities/product-detail.entity';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';
import { OrderFilterRequestDto } from './dto/request/order-filter.request.dto';
import { OrderRepository } from './repositories/order.repository';
import { UserAddressEntity } from '../user-addresses/entities/user-address.entity';
import { CartItemEntity } from '../cart/entities/cart-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
  ) {}

  async findAll(
    filterDto: OrderFilterRequestDto,
  ): Promise<[OrderEntity[], number]> {
    const { page = 1, size = 10, status, userId } = filterDto;
    const skip = (page - 1) * size;
    const where: FindOptionsWhere<OrderEntity> = {};

    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    return this.orderRepository.findAndCount({
      where,
      relations: {
        orderDetails: {
          productDetail: true,
        },
      },
      skip,
      take: size,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productDetailIds = createOrderDto.items.map(
        (item) => item.productDetailId,
      );
      const productDetails = await queryRunner.manager.find(
        ProductDetailEntity,
        {
          where: { id: In(productDetailIds) },
          lock: { mode: 'pessimistic_write' },
        },
      );
      const productDetailsMap = _.mapKeys(productDetails, (x) => x.id);

      const cartIds = createOrderDto.items
        .map((item) => item.cartId)
        .filter((id): id is number => id !== undefined && id !== null);

      let cartItemsMap: Record<string, CartItemEntity> = {};
      if (cartIds.length > 0) {
        const cartItems = await queryRunner.manager.find(CartItemEntity, {
          where: { id: In(cartIds), userId },
        });
        cartItemsMap = _.mapKeys(cartItems, (x) => x.id);
      }

      const {
        totalAmount,
        orderDetails,
        productDetailsToUpdate,
        cartItemsToRemove,
      } = createOrderDto.items.reduce(
        (acc, item) => {
          const productDetail = productDetailsMap[item.productDetailId];
          if (!productDetail) {
            throw new NotFoundException(
              `Sản phẩm với ID ${item.productDetailId} không tồn tại`,
            );
          }

          if (productDetail.stock < item.quantity) {
            throw new BadRequestException(
              `Sản phẩm ${item.productDetailId} không đủ số lượng (Còn: ${productDetail.stock})`,
            );
          }

          const price = Number(productDetail.price);
          acc.totalAmount += price * item.quantity;

          productDetail.reduceStock(item.quantity);
          acc.productDetailsToUpdate.push(productDetail);

          const orderDetail = OrderDetailEntity.create(
            productDetail.id,
            item.quantity,
            price,
          );
          acc.orderDetails.push(orderDetail);

          if (item.cartId && cartItemsMap[item.cartId]) {
            acc.cartItemsToRemove.push(cartItemsMap[item.cartId]);
          }

          return acc;
        },
        {
          totalAmount: 0,
          orderDetails: [] as OrderDetailEntity[],
          productDetailsToUpdate: [] as ProductDetailEntity[],
          cartItemsToRemove: [] as CartItemEntity[],
        },
      );

      if (productDetailsToUpdate.length > 0) {
        await queryRunner.manager.save(
          ProductDetailEntity,
          productDetailsToUpdate,
        );
      }

      const userAddress = await queryRunner.manager.findOne(UserAddressEntity, {
        where: { id: createOrderDto.userAddressId, userId },
      });

      if (!userAddress) {
        throw new NotFoundException(
          'Địa chỉ giao hàng không tồn tại hoặc không thuộc quyền sở hữu',
        );
      }

      const shippingAddress = {
        name: userAddress.receiverName,
        phone: userAddress.receiverPhone,
        address: userAddress.detailAddress,
      };

      const order = OrderEntity.create(
        userId,
        totalAmount,
        createOrderDto.paymentMethod,
        shippingAddress,
        orderDetails,
      );

      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      if (cartItemsToRemove.length > 0) {
        for (const cartItem of cartItemsToRemove) {
          cartItem.markAsDeleted();
        }
        await queryRunner.manager.save(CartItemEntity, cartItemsToRemove);
      }

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
            productDetail.increaseStock(detail.quantity); // CỘNG LẠI TỒN KHO
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
