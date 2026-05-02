import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProductImageResponseDto } from '../dto/response/product-image.response.dto';
import { ProductEntity } from './product.entity';

@Entity('product_images')
export class ProductImageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'is_thumbnail', default: false })
  isThumbnail: boolean;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductEntity, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  static create(imageUrl: string, isThumbnail: boolean, productId?: string): ProductImageEntity {
    const image = new ProductImageEntity();
    image.imageUrl = imageUrl;
    image.isThumbnail = isThumbnail;
    if (productId) {
      image.productId = productId;
    }
    return image;
  }

  toResponse(): ProductImageResponseDto {
    const response = new ProductImageResponseDto();
    response.id = this.id;
    response.imageUrl = this.imageUrl;
    response.isThumbnail = this.isThumbnail;
    return response;
  }
}
