import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { UserAddressResponseDto } from '../dto/response/user-address.response.dto';
import { CreateUserAddressDto } from '../dto/request/create-user-address.dto';
import { UpdateUserAddressDto } from '../dto/request/update-user-address.dto';

@Entity('user_addresses')
export class UserAddressEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'receiver_name' })
  receiverName: string;

  @Column({ name: 'receiver_phone' })
  receiverPhone: string;

  @Column({ name: 'detail_address' })
  detailAddress: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  static create(dto: CreateUserAddressDto, userId: string): UserAddressEntity {
    const address = new UserAddressEntity();
    address.receiverName = dto.receiverName;
    address.receiverPhone = dto.receiverPhone;
    address.detailAddress = dto.detailAddress;
    address.isDefault = dto.isDefault ?? false;
    address.userId = userId;
    return address;
  }

  update(dto: UpdateUserAddressDto): void {
    if (dto.receiverName !== undefined) this.receiverName = dto.receiverName;
    if (dto.receiverPhone !== undefined) this.receiverPhone = dto.receiverPhone;
    if (dto.detailAddress !== undefined) this.detailAddress = dto.detailAddress;
    if (dto.isDefault !== undefined) this.isDefault = dto.isDefault;
  }

  markAsDeleted(): void {
    this.deletedAt = new Date();
  }

  toResponse(): UserAddressResponseDto {
    const response = new UserAddressResponseDto();
    response.id = this.id;
    response.receiverName = this.receiverName;
    response.receiverPhone = this.receiverPhone;
    response.detailAddress = this.detailAddress;
    response.isDefault = this.isDefault;
    response.userId = this.userId;
    response.createdAt = this.createdAt;
    return response;
  }
}
