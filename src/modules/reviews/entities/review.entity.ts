import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ReviewResponseDto } from '../dto/response/review.response.dto';

@Entity('reviews')
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  init(userId: string, productId: string, orderId: string, rating: number, comment?: string) {
    this.userId = userId;
    this.productId = productId;
    this.orderId = orderId;
    this.rating = rating;
    if (comment) {
      this.comment = comment;
    }
  }

  toResponse(): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = this.id;
    dto.rating = this.rating;
    dto.comment = this.comment;
    dto.userId = this.userId;
    dto.productId = this.productId;
    dto.orderId = this.orderId;
    dto.createdAt = this.createdAt;
    return dto;
  }
}
