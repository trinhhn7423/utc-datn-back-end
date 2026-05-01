import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProductDetailResponseDto } from '../dto/response/product-detail.response.dto';
import { ProductEntity } from './product.entity';

@Entity('product_details')
export class ProductDetailEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  color: string;

  @Column()
  size: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductEntity, (product) => product.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  toResponse(): ProductDetailResponseDto {
    const response = new ProductDetailResponseDto();
    response.id = this.id;
    response.color = this.color;
    response.size = this.size;
    response.price = this.price.toString();
    response.stock = this.stock;
    return response;
  }
}
