import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductDetailResponseDto } from '../dto/response/product-detail.response.dto';
import { ProductEntity } from './product.entity';
import { CreateProductDetailDto } from '../dto/request/create-product.dto';
import { UpdateProductDetailDto } from '../dto/request/update-product.dto';

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

  @ManyToOne(() => ProductEntity, (product) => product.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  static create(dto: CreateProductDetailDto): ProductDetailEntity {
    const detail = new ProductDetailEntity();
    detail.color = dto.color;
    detail.size = dto.size;
    detail.price = dto.price;
    detail.stock = dto.stock;
    return detail;
  }

  update(dto: UpdateProductDetailDto): void {
    if (dto.color !== undefined) this.color = dto.color;
    if (dto.size !== undefined) this.size = dto.size;
    if (dto.price !== undefined) this.price = dto.price;
    if (dto.stock !== undefined) this.stock = dto.stock;
  }

  reduceStock(quantity: number): void {
    this.stock -= quantity;
  }

  increaseStock(quantity: number): void {
    this.stock += quantity;
  }

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
