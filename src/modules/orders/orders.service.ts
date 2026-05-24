import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, FindOptionsWhere, In, Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import * as _ from 'lodash';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { CreateOrderFromCartDto } from './dto/request/create-order-from-cart.dto';
import { PreOrderRequestDto } from './dto/request/pre-order.request.dto';
import { PreOrderResponseDto, PreOrderItemResponseDto } from './dto/response/pre-order.response.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderDetailEntity } from './entities/order-detail.entity';
import { ProductDetailEntity } from '../products/entities/product-detail.entity';
import { OrderStatus, PaymentStatus } from '../../common/enums/order.enum';
import { OrderFilterRequestDto } from './dto/request/order-filter.request.dto';
import { OrderRepository } from './repositories/order.repository';
import { UserAddressEntity } from '../user-addresses/entities/user-address.entity';
import { CartItemEntity } from '../cart/entities/cart-item.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    filterDto: OrderFilterRequestDto,
  ): Promise<[OrderEntity[], number]> {
    const { page = 1, size = 10, status, userId, search, startDate, endDate } = filterDto;
    const skip = (page - 1) * size;
    const baseWhere: FindOptionsWhere<OrderEntity> = {};

    if (status) {
      baseWhere.status = status;
    }
    if (userId) {
      baseWhere.userId = userId;
    }
    if (startDate && endDate) {
      baseWhere.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      baseWhere.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      baseWhere.createdAt = LessThanOrEqual(new Date(endDate));
    }

    let whereConditions: FindOptionsWhere<OrderEntity>[] = [baseWhere];

    if (search) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
      if (isUuid) {
        whereConditions = [
          { ...baseWhere, id: search },
          { ...baseWhere, user: { fullName: Like(`%${search}%`) } },
        ];
      } else {
        whereConditions = [
          { ...baseWhere, user: { fullName: Like(`%${search}%`) } },
        ];
      }
    }

    return this.orderRepository.findAndCount({
      where: whereConditions,
      relations: {
        user: true,
        orderDetails: {
          productDetail: {
            product: {
              images: true,
            },
          },
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
          relations: { product: true },
          lock: { mode: 'pessimistic_write' },
        },
      );
      const productDetailsMap = _.mapKeys(productDetails, (x) => x.id);
      const {
        totalAmount,
        orderDetails,
        productDetailsToUpdate,
        cartItemsToRemove,
        lowStockItems,
      } = createOrderDto.items.reduce(
        (acc, item) => {
          const productDetail = productDetailsMap[item.productDetailId];
          if (!productDetail) {
            throw new NotFoundException(
              `Sản phẩm với ID ${item.productDetailId} không tồn tại`,
            );
          }

          if (productDetail.product && productDetail.product.isPublished === false) {
            throw new BadRequestException(
              `Sản phẩm ${productDetail.product.name} hiện đã ngừng bán`,
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

          // Thu thập cảnh báo tồn kho sau khi giảm
          const LOW_STOCK_THRESHOLD = 10;
          if (productDetail.stock < LOW_STOCK_THRESHOLD) {
            acc.lowStockItems.push(productDetail);
          }

          const orderDetail = OrderDetailEntity.create(
            productDetail.id,
            item.quantity,
            price,
          );
          acc.orderDetails.push(orderDetail);
          return acc;
        },
        {
          totalAmount: 0,
          orderDetails: [] as OrderDetailEntity[],
          productDetailsToUpdate: [] as ProductDetailEntity[],
          cartItemsToRemove: [] as CartItemEntity[],
          lowStockItems: [] as ProductDetailEntity[],
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

      const savedOrderFull = (await this.dataSource.manager.findOne(OrderEntity, {
        where: { id: savedOrder.id },
        relations: { orderDetails: true },
      })) as OrderEntity;

      this.eventEmitter.emit('order.created', {
        orderId: savedOrderFull.id,
        userId: savedOrderFull.userId,
        totalAmount: savedOrderFull.totalAmount,
      });

      for (const item of lowStockItems) {
        this.eventEmitter.emit('low_stock.warning', {
          productDetailId: item.id,
          productName: item.product?.name ?? 'Unknown',
          color: item.color,
          size: item.size,
          stock: item.stock,
        });
      }

      return savedOrderFull;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createOrderFromCart(
    userId: string,
    createOrderFromCartDto: CreateOrderFromCartDto,
  ): Promise<OrderEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cartItems = await queryRunner.manager.find(CartItemEntity, {
        where: { id: In(createOrderFromCartDto.cartItemIds), userId },
      });

      if (cartItems.length !== createOrderFromCartDto.cartItemIds.length) {
        throw new NotFoundException('Một hoặc nhiều sản phẩm trong giỏ hàng không tồn tại');
      }

      const productDetailIds = cartItems.map((item) => item.productDetailId);
      const productDetails = await queryRunner.manager.find(
        ProductDetailEntity,
        {
          where: { id: In(productDetailIds) },
          relations: { product: true },
          lock: { mode: 'pessimistic_write' },
        },
      );
      const productDetailsMap = _.mapKeys(productDetails, (x) => x.id);

      const {
        totalAmount,
        orderDetails,
        productDetailsToUpdate,
        cartItemsToRemove,
        lowStockItems,
      } = cartItems.reduce(
        (acc, cartItem) => {
          const productDetail = productDetailsMap[cartItem.productDetailId];
          if (!productDetail) {
            throw new NotFoundException(
              `Sản phẩm chi tiết với ID ${cartItem.productDetailId} không tồn tại`,
            );
          }

          if (productDetail.product && productDetail.product.isPublished === false) {
            throw new BadRequestException(
              `Sản phẩm ${productDetail.product.name} hiện đã ngừng bán`,
            );
          }

          if (productDetail.stock < cartItem.quantity) {
            throw new BadRequestException(
              `Sản phẩm ${cartItem.productDetailId} không đủ số lượng (Còn: ${productDetail.stock})`,
            );
          }

          const price = Number(productDetail.price);
          acc.totalAmount += price * cartItem.quantity;

          productDetail.reduceStock(cartItem.quantity);
          acc.productDetailsToUpdate.push(productDetail);

          // Thu thập cảnh báo tồn kho sau khi giảm
          const LOW_STOCK_THRESHOLD = 10;
          if (productDetail.stock < LOW_STOCK_THRESHOLD) {
            acc.lowStockItems.push(productDetail);
          }

          const orderDetail = OrderDetailEntity.create(
            productDetail.id,
            cartItem.quantity,
            price,
          );
          acc.orderDetails.push(orderDetail);
          acc.cartItemsToRemove.push(cartItem);
          
          return acc;
        },
        {
          totalAmount: 0,
          orderDetails: [] as OrderDetailEntity[],
          productDetailsToUpdate: [] as ProductDetailEntity[],
          cartItemsToRemove: [] as CartItemEntity[],
          lowStockItems: [] as ProductDetailEntity[],
        },
      );

      if (productDetailsToUpdate.length > 0) {
        await queryRunner.manager.save(
          ProductDetailEntity,
          productDetailsToUpdate,
        );
      }
      
      const userAddress = await queryRunner.manager.findOne(UserAddressEntity, {
        where: { id: createOrderFromCartDto.userAddressId, userId },
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
        createOrderFromCartDto.paymentMethod,
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

      const savedOrderFull = (await this.dataSource.manager.findOne(OrderEntity, {
        where: { id: savedOrder.id },
        relations: { orderDetails: true },
      })) as OrderEntity;

      this.eventEmitter.emit('order.created', {
        orderId: savedOrderFull.id,
        userId: savedOrderFull.userId,
        totalAmount: savedOrderFull.totalAmount,
      });

      for (const item of lowStockItems) {
        this.eventEmitter.emit('low_stock.warning', {
          productDetailId: item.id,
          productName: item.product?.name ?? 'Unknown',
          color: item.color,
          size: item.size,
          stock: item.stock,
        });
      }

      return savedOrderFull;
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

      this.eventEmitter.emit('order.status_updated', {
        orderId: savedOrder.id,
        userId: savedOrder.userId,
        newStatus: status,
      });

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async preOrder(
    userId: string,
    preOrderDto: PreOrderRequestDto,
  ): Promise<PreOrderResponseDto> {
    const { cartItemIds, items } = preOrderDto;

    if ((!cartItemIds || cartItemIds.length === 0) && (!items || items.length === 0)) {
      throw new BadRequestException('Phải truyền vào cartItemIds hoặc items');
    }

    let inputItems: { productDetailId: number; quantity: number }[] = [];

    if (cartItemIds && cartItemIds.length > 0) {
      const cartItems = await this.dataSource.manager.find(CartItemEntity, {
        where: { id: In(cartItemIds), userId },
      });

      if (cartItems.length !== cartItemIds.length) {
        throw new NotFoundException('Một hoặc nhiều sản phẩm trong giỏ hàng không tồn tại');
      }

      inputItems = cartItems.map((item) => ({
        productDetailId: item.productDetailId,
        quantity: item.quantity,
      }));
    } else if (items && items.length > 0) {
      inputItems = items.map((item) => {
        if (!item.productDetailId || !item.quantity) {
          throw new BadRequestException('Chi tiết sản phẩm và số lượng không được để trống');
        }
        return {
          productDetailId: item.productDetailId,
          quantity: item.quantity,
        };
      });
    }

    const productDetailIds = inputItems.map((item) => item.productDetailId);
    
    const productDetails = await this.dataSource.manager.find(
      ProductDetailEntity,
      {
        where: { id: In(productDetailIds) },
        relations: { product: { images: true } },
      },
    );

    const productDetailsMap = _.mapKeys(productDetails, (x) => x.id);

    let totalAmount = 0;
    const responseItems: PreOrderItemResponseDto[] = [];

    for (const item of inputItems) {
      const productDetail = productDetailsMap[item.productDetailId];
      if (!productDetail) {
        throw new NotFoundException(
          `Sản phẩm chi tiết với ID ${item.productDetailId} không tồn tại`,
        );
      }

      if (productDetail.product && productDetail.product.isPublished === false) {
        throw new BadRequestException(
          `Sản phẩm ${productDetail.product.name} hiện đã ngừng bán`,
        );
      }

      if (productDetail.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm ${productDetail.product?.name || item.productDetailId} (Màu: ${productDetail.color}, Size: ${productDetail.size}) không đủ số lượng (Còn: ${productDetail.stock})`,
        );
      }

      const price = Number(productDetail.price);
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;

      const thumbnail = productDetail.product?.images?.find((img) => img.isThumbnail)?.imageUrl || 
                        productDetail.product?.images?.[0]?.imageUrl || '';

      responseItems.push({
        productDetailId: productDetail.id,
        productId: productDetail.product?.id || '',
        name: productDetail.product?.name || '',
        thumbnail: thumbnail,
        color: productDetail.color,
        size: productDetail.size,
        price: productDetail.price.toString(),
        quantity: item.quantity,
        totalPrice: itemTotal.toString(),
      });
    }

    return {
      totalAmount: totalAmount.toString(),
      items: responseItems,
    };
  }
}
