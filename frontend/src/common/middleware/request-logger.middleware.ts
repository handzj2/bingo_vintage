/**
 * RequestLoggerMiddleware
 *
 * Logs every HTTP request with method, path, status code, and execution time.
 * Use this to identify which endpoints are slow.
 *
 * Output format:
 *   [HTTP] POST /api/auth/login → 200 | 143ms
 *   [HTTP] GET  /api/loans      → 200 | 2341ms  ← spot the slow ones
 *
 * Register in AppModule:
 *   export class AppModule implements NestModule {
 *     configure(consumer: MiddlewareConsumer) {
 *       consumer.apply(RequestLoggerMiddleware).forRoutes('*');
 *     }
 *   }
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const ms     = Date.now() - start;
      const status = res.statusCode;

      // Colour-code by speed: green < 500ms, yellow < 2000ms, red >= 2000ms
      const flag = ms >= 2000 ? '🔴 SLOW' : ms >= 500 ? '🟡' : '✅';

      this.logger.log(`${method.padEnd(6)} ${originalUrl} → ${status} | ${ms}ms ${ms >= 500 ? flag : ''}`);
    });

    next();
  }
}
