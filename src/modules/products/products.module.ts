import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductEntity } from './entities/product.entity';
import { ProductDetailEntity } from './entities/product-detail.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductRepository } from './repositories/product.repository';
import { ProductDetailRepository } from './repositories/product-detail.repository';
import { ProductImageRepository } from './repositories/product-image.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, ProductDetailEntity, ProductImageEntity])],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductRepository,
    ProductDetailRepository,
    ProductImageRepository,
  ],
  exports: [ProductsService, ProductRepository],
})
export class ProductsModule {}
