import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserEntity } from './entities/user.entity';
import { UserFilterRequestDto } from './dto/request/user-filter.request.dto';
import { CreateUserDto } from './dto/request/create-user.dto';
import * as bcrypt from 'bcrypt';
import { FindOptionsWhere, Like } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(
    filterDto: UserFilterRequestDto,
  ): Promise<[UserEntity[], number]> {
    const { page = 1, size = 10, email, fullName } = filterDto;
    const skip = (page - 1) * size;
    const where: FindOptionsWhere<UserEntity> = {};

    if (email) {
      where.email = Like(`%${email}%`);
    }
    if (fullName) {
      where.fullName = Like(`%${fullName}%`);
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
    
    return this.usersRepository.save(user);
  }
}
