import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProductDetailEntity } from '../entities/product-detail.entity';

@Injectable()
export class ProductDetailRepository extends Repository<ProductDetailEntity> {
  constructor(private dataSource: DataSource) {
    super(ProductDetailEntity, dataSource.createEntityManager());
  }
}
