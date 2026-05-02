import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserAddressEntity } from './entities/user-address.entity';
import { CreateUserAddressDto } from './dto/request/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/request/update-user-address.dto';

@Injectable()
export class UserAddressesService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(userId: string): Promise<UserAddressEntity[]> {
    return this.dataSource.manager.find(UserAddressEntity, {
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: number, userId: string): Promise<UserAddressEntity> {
    const address = await this.dataSource.manager.findOne(UserAddressEntity, {
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('Địa chỉ không tồn tại hoặc không thuộc quyền sở hữu');
    }
    return address;
  }

  async create(userId: string, dto: CreateUserAddressDto): Promise<UserAddressEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user has no addresses, make this one default automatically
      if (dto.isDefault === undefined) {
        const count = await queryRunner.manager.count(UserAddressEntity, { where: { userId } });
        dto.isDefault = count === 0;
      }

      if (dto.isDefault) {
        // Reset all other default addresses for this user
        await queryRunner.manager.update(
          UserAddressEntity,
          { userId, isDefault: true },
          { isDefault: false },
        );
      }

      const newAddress = UserAddressEntity.create(dto, userId);
      const savedAddress = await queryRunner.manager.save(UserAddressEntity, newAddress);

      await queryRunner.commitTransaction();
      return savedAddress;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, userId: string, dto: UpdateUserAddressDto): Promise<UserAddressEntity> {
    const address = await this.findById(id, userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.isDefault === true && !address.isDefault) {
        // Reset all other default addresses
        await queryRunner.manager.update(
          UserAddressEntity,
          { userId, isDefault: true },
          { isDefault: false },
        );
      }

      address.update(dto);
      const updatedAddress = await queryRunner.manager.save(UserAddressEntity, address);

      await queryRunner.commitTransaction();
      return updatedAddress;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number, userId: string): Promise<void> {
    const address = await this.findById(id, userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      address.markAsDeleted();
      await queryRunner.manager.save(UserAddressEntity, address);

      // Nếu xóa địa chỉ mặc định, tự động gán mặc định cho địa chỉ mới nhất (nếu có)
      if (address.isDefault) {
        const latestAddress = await queryRunner.manager.findOne(UserAddressEntity, {
          where: { userId },
          order: { createdAt: 'DESC' },
        });
        if (latestAddress) {
          latestAddress.isDefault = true;
          await queryRunner.manager.save(UserAddressEntity, latestAddress);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
