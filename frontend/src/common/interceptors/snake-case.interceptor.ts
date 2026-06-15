/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  snake-case.interceptor.ts                                          ║
 * ║  Place this file at:                                                ║
 * ║    backend/src/common/interceptors/snake-case.interceptor.ts        ║
 * ║                                                                     ║
 * ║  Then register globally in main.ts:                                 ║
 * ║    app.useGlobalInterceptors(new SnakeCaseInterceptor());           ║
 * ║                                                                     ║
 * ║  What it fixes:                                                     ║
 * ║  NestJS TypeORM entities return camelCase JS property names         ║
 * ║  (firstName, createdAt, nextOfKinName). Every frontend type file    ║
 * ║  used snake_case (first_name, created_at, next_of_kin_name).       ║
 * ║  This interceptor converts ALL response keys to snake_case          ║
 * ║  automatically, making the frontend types correct as-is.            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.toSnakeCase(data)));
  }

  private toSnakeCase(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (value instanceof Date) return value;
    if (Buffer.isBuffer(value)) return value;

    if (Array.isArray(value)) {
      return value.map((item) => this.toSnakeCase(item));
    }

    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      // Skip TypeORM internal symbols and private fields
      if (key.startsWith('__')) continue;

      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`,
      );
      result[snakeKey] = this.toSnakeCase(value[key]);
    }
    return result;
  }
}
