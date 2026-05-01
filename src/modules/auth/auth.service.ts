import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
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
    const user = await this.usersRepository.findOne({
      where: {
        email: loginDto.email,
      },
      relations: {
        role: true,
      },
    });

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

    const hashedRefreshToken = await bcrypt.hash(tokens.refresh_token, 10);
    user.updateRefreshToken(hashedRefreshToken);
    await this.usersRepository.save(user);

    return {
      ...tokens,
      user: user.toResponse(),
    };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>(EnvVars.JWT_REFRESH_SECRET),
      });

      console.log('payload', payload);

      const user = await this.usersRepository.findOneBy({
        id: payload.sub,
      });

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

      const access_token = await this.jwtService.signAsync(
        { sub: user.id, role: payload.role },
        {
          secret: this.configService.get<string>(EnvVars.JWT_ACCESS_SECRET),
          expiresIn: '15m',
        },
      );

      return { access_token };
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
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: this.configService.get<string>(EnvVars.JWT_ACCESS_SECRET),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, role },
        {
          secret: this.configService.get<string>(EnvVars.JWT_REFRESH_SECRET),
          expiresIn: '7d',
        },
      ),
    ]);

    return { access_token, refresh_token };
  }
}
