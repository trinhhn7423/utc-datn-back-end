import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, body, query } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      
      // Do not log password / sensitive fields in plain text
      const safeBody = { ...body };
      if (safeBody.password) {
        safeBody.password = '******';
      }

      this.logger.log(
        `[${method}] ${originalUrl} ${statusCode} - ${duration}ms | Query: ${JSON.stringify(
          query,
        )} | Body: ${JSON.stringify(safeBody)} | UA: ${userAgent}`,
      );
    });

    next();
  }
}
