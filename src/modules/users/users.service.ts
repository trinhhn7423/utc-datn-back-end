import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserEntity } from './entities/user.entity';
import { UserFilterRequestDto } from './dto/request/user-filter.request.dto';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserDto } from './dto/request/update-user.dto';
import * as bcrypt from 'bcrypt';
import { FindOptionsWhere, Like } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { OrderStatus } from '../../common/enums/order.enum';
import { OrderDetailEntity } from '../orders/entities/order-detail.entity';
import { UserAddressEntity } from '../user-addresses/entities/user-address.entity';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(
    filterDto: UserFilterRequestDto,
  ): Promise<[UserEntity[], number]> {
    const { page = 1, size = 10, email, fullName, roleId } = filterDto;
    const skip = (page - 1) * size;
    const where: FindOptionsWhere<UserEntity> = {};

    if (email) {
      where.email = Like(`%${email}%`);
    }
    if (fullName) {
      where.fullName = Like(`%${fullName}%`);
    }
    if (roleId) {
      where.roleId = roleId;
    }

    return this.usersRepository.findAndCount({
      where,
      skip,
      take: size,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        addresses: true,
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = UserEntity.createByAdmin(dto, hashedPassword);

    if (dto.phone || dto.address) {
      const userAddress = new UserAddressEntity();
      userAddress.receiverName = dto.fullName;
      userAddress.receiverPhone = dto.phone || '';
      userAddress.detailAddress = dto.address || '';
      userAddress.isDefault = true;
      user.addresses = [userAddress];
    }
    
    return this.usersRepository.save(user);
  }

  async getCounters(
    userId: string,
  ): Promise<{ totalOrders: number; totalReviews: number; viewsCount: number }> {
    // 1. Increment the viewsCount for the user
    await this.usersRepository.increment({ id: userId }, 'viewsCount', 1);

    // 2. Fetch the user to get the current viewsCount
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const viewsCount = user ? user.viewsCount : 0;

    // 3. Count total orders using manager
    const totalOrders = await this.usersRepository.manager.count(OrderEntity, {
      where: { userId },
    });

    // 4. Count total reviews using manager
    const totalReviews = await this.usersRepository.manager.count(ReviewEntity, {
      where: { userId },
    });

    return {
      totalOrders,
      totalReviews,
      viewsCount,
    };
  }

  async getOrderCounters(userId: string): Promise<{
    pendingConfirmation: number;
    pendingPickup: number;
    delivering: number;
    needReview: number;
  }> {
    // 1. Count order status PENDING
    const pendingConfirmation = await this.usersRepository.manager.count(OrderEntity, {
      where: { userId, status: OrderStatus.PENDING },
    });

    // 2. Count order status CONFIRMED
    const pendingPickup = await this.usersRepository.manager.count(OrderEntity, {
      where: { userId, status: OrderStatus.CONFIRMED },
    });

    // 3. Count order status SHIPPING
    const delivering = await this.usersRepository.manager.count(OrderEntity, {
      where: { userId, status: OrderStatus.SHIPPING },
    });

    // 4. Count unreviewed items (needReview)
    const needReview = await this.usersRepository.manager
      .getRepository(OrderDetailEntity)
      .createQueryBuilder('orderDetail')
      .innerJoin('orderDetail.order', 'order')
      .innerJoin('orderDetail.productDetail', 'productDetail')
      .leftJoin(
        ReviewEntity,
        'review',
        'review.orderId = order.id AND review.productId = productDetail.productId AND review.userId = :userId',
        { userId },
      )
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('review.id IS NULL')
      .getCount();

    return {
      pendingConfirmation,
      pendingPickup,
      delivering,
      needReview,
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email đã tồn tại');
      }
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }

    if (dto.roleId !== undefined) {
      user.roleId = dto.roleId;
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    if (dto.password !== undefined && dto.password.length >= 6) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.phone !== undefined || dto.address !== undefined) {
      if (!user.addresses || user.addresses.length === 0) {
        const userAddress = new UserAddressEntity();
        userAddress.receiverName = user.fullName;
        userAddress.receiverPhone = dto.phone || '';
        userAddress.detailAddress = dto.address || '';
        userAddress.isDefault = true;
        userAddress.userId = user.id;
        user.addresses = [userAddress];
      } else {
        const defaultAddress = user.addresses.find(a => a.isDefault) || user.addresses[0];
        if (dto.phone !== undefined) defaultAddress.receiverPhone = dto.phone;
        if (dto.address !== undefined) defaultAddress.detailAddress = dto.address;
        if (dto.fullName !== undefined) defaultAddress.receiverName = dto.fullName;
      }
    }

    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async getAdminCounters(): Promise<{ total: number; admins: number; customers: number }> {
    const total = await this.usersRepository.count();
    const admins = await this.usersRepository.count({ where: { roleId: 1 } });
    const customers = await this.usersRepository.count({ where: { roleId: 2 } });
    return { total, admins, customers };
  }
}
