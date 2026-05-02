import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { UserResponseDto } from '../dto/response/user.response.dto';
import { RegisterDto } from 'src/modules/auth/dto/request/register.dto';
import { UserAddressEntity } from '../../user-addresses/entities/user-address.entity';
import { OneToMany } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Hide password by default in queries
  password: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'role_id' })
  roleId: number;

  @Column({ name: 'hashed_refresh_token', nullable: true, select: false })
  hashedRefreshToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => RoleEntity, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @OneToMany(() => UserAddressEntity, (address) => address.user, { cascade: true })
  addresses: UserAddressEntity[];

  static createUser(userData: RegisterDto, hashedPassword: string): UserEntity {
    const user = new UserEntity();
    user.email = userData.email;
    user.password = hashedPassword;
    user.fullName = userData.fullName;
    user.roleId = 2; // Default USER role id
    return user;
  }

  updateRefreshToken(hashedToken: string): void {
    this.hashedRefreshToken = hashedToken;
  }

  toResponse(): UserResponseDto {
    const response = new UserResponseDto();
    response.id = this.id;
    response.fullName = this.fullName;
    response.email = this.email;
    response.roleId = this.roleId;
    response.avatarUrl = this.avatarUrl;
    response.createdAt = this.createdAt;

    if (this.addresses) {
      response.addresses = this.addresses.map(addr => addr.toResponse());
    }
    return response;
  }
}
