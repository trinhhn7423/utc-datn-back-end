import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';
import { CategoryResponseDto } from '../dto/response/category.response.dto';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => ProductEntity, (product) => product.category)
  products: ProductEntity[];

  toResponse(): CategoryResponseDto {
    const response = new CategoryResponseDto();
    response.id = this.id;
    response.name = this.name;
    response.description = this.description;
    return response;
  }
}
