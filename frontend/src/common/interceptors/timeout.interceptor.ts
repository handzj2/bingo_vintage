import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/** Default timeout for all endpoints — 15 seconds */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Per-route override: @Timeout(60_000) on a controller method */
export const TIMEOUT_KEY = 'request_timeout_ms';
export const Timeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);

/**
 * TimeoutInterceptor — Enterprise edition
 *
 * - Global 15s default timeout prevents hung DB queries from leaking threads
 * - Per-route override via @Timeout(ms) decorator for long-running reports
 * - Returns RFC-7807-style error with request path and timeout value
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector?: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const routeTimeout = this.reflector?.getAllAndOverride<number>(TIMEOUT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const ms = routeTimeout ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          const req = ctx.switchToHttp().getRequest();
          return throwError(() =>
            new RequestTimeoutException(
              `Request to ${req?.method} ${req?.url} timed out after ${ms / 1000}s. ` +
              'If this is a long report, contact your administrator.',
            ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
