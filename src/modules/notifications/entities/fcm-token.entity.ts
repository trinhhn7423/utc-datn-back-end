import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('fcm_tokens')
@Index('idx_fcm_user_id', ['userId'])
export class FcmTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ unique: true })
  token: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
