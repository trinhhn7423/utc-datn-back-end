import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FcmTokenEntity } from './entities/fcm-token.entity';
import { EnvVars } from '../../common/enums/env.enum';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(FcmTokenEntity)
    private readonly fcmTokenRepository: Repository<FcmTokenEntity>,
  ) {}

  onModuleInit(): void {
    if (!admin.apps.length) {
      const projectId = this.configService.get<string>(EnvVars.FIREBASE_PROJECT_ID);
      const clientEmail = this.configService.get<string>(EnvVars.FIREBASE_CLIENT_EMAIL);
      const privateKey = this.configService
        .get<string>(EnvVars.FIREBASE_PRIVATE_KEY)
        ?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn('Firebase credentials not configured. FCM push notifications will be disabled.');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.logger.log('Firebase Admin SDK initialized.');
    }
  }

  async registerToken(userId: string, token: string): Promise<void> {
    // Upsert: nếu token đã tồn tại thì cập nhật userId (1 token có thể đổi user khi logout/login)
    const existing = await this.fcmTokenRepository.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      await this.fcmTokenRepository.save(existing);
    } else {
      const entity = this.fcmTokenRepository.create({ userId, token });
      await this.fcmTokenRepository.save(entity);
    }
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!admin.apps.length) return;

    const tokens = await this.fcmTokenRepository.find({ where: { userId } });
    if (!tokens.length) return;

    const tokenStrings = tokens.map((t) => t.token);

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokenStrings,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      // Remove invalid/expired tokens
      const expiredTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            expiredTokens.push(tokenStrings[idx]);
          }
        }
      });

      if (expiredTokens.length > 0) {
        await this.fcmTokenRepository
          .createQueryBuilder()
          .delete()
          .where('token IN (:...tokens)', { tokens: expiredTokens })
          .execute();
        this.logger.log(`Removed ${expiredTokens.length} expired FCM tokens.`);
      }
    } catch (error) {
      this.logger.error('Failed to send FCM notification', error);
    }
  }
}
