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

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ name: 'role_id' })
  roleId: number;

  @Column({ name: 'hashed_refresh_token', nullable: true, select: false })
  hashedRefreshToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => RoleEntity, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  static createUser(userData: RegisterDto, hashedPassword: string): UserEntity {
    const user = new UserEntity();
    user.email = userData.email;
    user.password = hashedPassword;
    user.fullName = userData.full_name;
    user.phone = userData.phone;
    user.address = userData.address;
    user.roleId = 2; // Default USER role id
    return user;
  }

  updateRefreshToken(hashedToken: string): void {
    this.hashedRefreshToken = hashedToken;
  }

  toResponse(): UserResponseDto {
    const response = new UserResponseDto();
    response.id = this.id;
    response.full_name = this.fullName;
    response.email = this.email;
    response.phone = this.phone;
    response.address = this.address;
    response.role_id = this.roleId;
    response.created_at = this.createdAt;
    return response;
  }
}
