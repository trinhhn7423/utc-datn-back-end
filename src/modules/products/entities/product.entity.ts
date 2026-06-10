import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { ProductDetailEntity } from './product-detail.entity';
import { ProductImageEntity } from './product-image.entity';
import { ProductResponseDto } from '../dto/response/product.response.dto';
import { CreateProductDto } from '../dto/request/create-product.dto';
import { UpdateProductDto } from '../dto/request/update-product.dto';

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

  @Column({ name: 'is_published', default: true })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CategoryEntity, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @OneToMany(() => ProductDetailEntity, (detail) => detail.product, { cascade: true })
  details: ProductDetailEntity[];

  @OneToMany(() => ProductImageEntity, (image) => image.product, { cascade: true })
  images: ProductImageEntity[];

  static create(dto: CreateProductDto): ProductEntity {
    const product = new ProductEntity();
    product.name = dto.name;
    product.description = dto.description;
    product.brand = dto.brand;
    product.origin = dto.origin;
    product.categoryId = dto.categoryId;
    return product;
  }

  update(dto: Partial<ProductEntity> | any): void {
    if (dto.name !== undefined) this.name = dto.name;
    if (dto.description !== undefined) this.description = dto.description;
    if (dto.brand !== undefined) this.brand = dto.brand;
    if (dto.origin !== undefined) this.origin = dto.origin;
    if (dto.categoryId !== undefined) this.categoryId = Number(dto.categoryId);
  }

  toResponse(): ProductResponseDto {
    const response = new ProductResponseDto();
    response.id = this.id;
    response.name = this.name;
    response.description = this.description;
    response.brand = this.brand;
    response.origin = this.origin;
    response.isPublished = this.isPublished;
    response.createdAt = this.createdAt;
    response.updatedAt = this.updatedAt;

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
