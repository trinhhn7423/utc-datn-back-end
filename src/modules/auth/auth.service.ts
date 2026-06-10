import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { AuthResponseDto } from './dto/response/auth.response.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../users/entities/user.entity';
import { UserResponseDto } from '../users/dto/response/user.response.dto';
import { EnvVars } from '../../common/enums/env.enum';
import { DataSource } from 'typeorm';
import { RoleEntity } from '../users/entities/role.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async initRoles() {
    const roleRepo = this.dataSource.getRepository(RoleEntity);
    const count = await roleRepo.count();
    if (count > 0) return { message: 'Roles đã được khởi tạo' };

    await roleRepo.save([
      { id: 1, name: 'ADMIN' },
      { id: 2, name: 'USER' },
    ]);
    return { message: 'Khởi tạo Role thành công' };
  }

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findOne({
      where: {
        email: registerDto.email,
      },
    });
    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const entity = UserEntity.createUser(registerDto, hashedPassword);

    await this.usersRepository.save(entity);
    return entity.toResponse();
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.addresses', 'addresses')
      .addSelect('user.password')
      .where('user.email = :email', { email: loginDto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.role?.name || 'USER',
    );

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.updateRefreshToken(hashedRefreshToken);
    await this.usersRepository.save(user);

    return {
      ...tokens,
      user: user.toResponse(),
    };
  }

  async adminLogin(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.addresses', 'addresses')
      .addSelect('user.password')
      .where('user.email = :email', { email: loginDto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    if (user.role?.name !== 'ADMIN') {
      throw new UnauthorizedException(
        'Tài khoản không có quyền truy cập trang quản trị',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.role?.name || 'ADMIN',
    );

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.updateRefreshToken(hashedRefreshToken);
    await this.usersRepository.save(user);

    return {
      ...tokens,
      user: user.toResponse(),
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>(EnvVars.JWT_REFRESH_SECRET),
      });
      const user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.hashedRefreshToken')
        .where('user.id = :id', { id: payload.sub })
        .getOne();

      if (!user) {
        throw new UnauthorizedException('User không tồn tại');
      }

      // Compare refresh token with hashed one in DB
      const isTokenValid = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      );
      if (!isTokenValid) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, role: payload.role },
        {
          secret: this.configService.get<string>(EnvVars.JWT_ACCESS_SECRET),
          expiresIn: '365d',
        },
      );

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  private async generateTokens(userId: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: this.configService.get<string>(EnvVars.JWT_ACCESS_SECRET),
          expiresIn: '365d',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: this.configService.get<string>(EnvVars.JWT_REFRESH_SECRET),
          expiresIn: '365d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedNewPassword;
    await this.usersRepository.save(user);
  }
}
