import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductImageEntity } from '../entities/product-image.entity';

@Injectable()
export class ProductImageRepository extends Repository<ProductImageEntity> {
  constructor(private dataSource: DataSource) {
    super(ProductImageEntity, dataSource.createEntityManager());
  }
}
