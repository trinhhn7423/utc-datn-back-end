import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { StatisticsModule } from './modules/statistics/statistics.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LoggerMiddleware } from './core/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      // Cho phép dùng ký tự đại diện (* hoặc **) để lắng nghe nhóm sự kiện (vd: '@OnEvent("order.*")')
      wildcard: false,

      // Ký tự dùng để phân tách các cấp độ (namespace) trong tên sự kiện (vd: 'order.created')
      delimiter: '.',

      // Tự động phát sự kiện nội bộ 'newListener' mỗi khi có một hàm đăng ký lắng nghe mới (thường dùng để debug)
      newListener: false,

      // Tự động phát sự kiện nội bộ 'removeListener' mỗi khi một hàm lắng nghe bị gỡ bỏ khỏi bộ nhớ
      removeListener: false,

      // Số lượng hàm lắng nghe (@OnEvent) tối đa cùng nhận một sự kiện.
      // Vượt quá số này NodeJS sẽ báo Warning nghi ngờ rò rỉ bộ nhớ (Memory Leak).
      maxListeners: 10,

      // Nếu bị Warning Memory Leak (do vượt maxListeners), bật true sẽ in ra chi tiết Call Stack để dễ tìm file/dòng code gây lỗi
      verboseMemoryLeak: false,

      // Xử lý khi một hàm @OnEvent bị lỗi (throw error).
      // Luôn để false để lỗi văng ra rõ ràng, nếu để true nó sẽ "nuốt" lỗi một cách im lặng khiến bạn không thể trace bug.
      ignoreErrors: false,
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
        logging: true,
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
    StatisticsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
