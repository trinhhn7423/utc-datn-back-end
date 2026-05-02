import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { ProductsModule } from '../products/products.module';
import { CartItemRepository } from './repositories/cart-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CartItemEntity]), ProductsModule],
  controllers: [CartController],
  providers: [CartService, CartItemRepository],
  exports: [CartService, CartItemRepository],
})
export class CartModule {}
