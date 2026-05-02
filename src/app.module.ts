import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EnvVars } from './common/enums/env.enum';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UserAddressesModule } from './modules/user-addresses/user-addresses.module';
import { CartModule } from './modules/cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // or 'postgres'
        host: configService.get<string>(EnvVars.DB_HOST, 'localhost'),
        port: configService.get<number>(EnvVars.DB_PORT, 3306),
        username: configService.get<string>(EnvVars.DB_USERNAME, 'root'),
        password: configService.get<string>(EnvVars.DB_PASSWORD, ''),
        database: configService.get<string>(EnvVars.DB_DATABASE, 'datn_utc'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Should be false in production
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    ReviewsModule,
    UserAddressesModule,
    CartModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
