import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { ProductDetailEntity } from './product-detail.entity';
import { ProductImageEntity } from './product-image.entity';
import { ProductResponseDto } from '../dto/response/product.response.dto';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  brand?: string;

  @Column({ nullable: true })
  origin?: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => CategoryEntity, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @OneToMany(() => ProductDetailEntity, (detail) => detail.product, { cascade: true })
  details: ProductDetailEntity[];

  @OneToMany(() => ProductImageEntity, (image) => image.product, { cascade: true })
  images: ProductImageEntity[];

  toResponse(): ProductResponseDto {
    const response = new ProductResponseDto();
    response.id = this.id;
    response.name = this.name;
    response.description = this.description;
    response.brand = this.brand;
    response.origin = this.origin;

    if (this.category) {
      response.category = this.category.toResponse();
    }
    if (this.details) {
      response.details = this.details.map((d) => d.toResponse());
    }
    if (this.images) {
      response.images = this.images.map((i) => i.toResponse());
    }
    return response;
  }
}
