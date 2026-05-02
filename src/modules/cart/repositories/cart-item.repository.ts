import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CartItemEntity } from '../entities/cart-item.entity';

@Injectable()
export class CartItemRepository extends Repository<CartItemEntity> {
  constructor(private dataSource: DataSource) {
    super(CartItemEntity, dataSource.createEntityManager());
  }
}
