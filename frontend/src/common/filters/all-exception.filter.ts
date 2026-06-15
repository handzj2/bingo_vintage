import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION   = '23505';
const PG_FK_VIOLATION       = '23503';
const PG_NOT_NULL_VIOLATION = '23502';
const PG_CHECK_VIOLATION    = '23514';

/**
 * AllExceptionFilter — Enterprise edition
 *
 * - Normalises all errors (HTTP, TypeORM, unknown) into a consistent JSON shape
 * - Logs stack traces in development, suppresses them in production
 * - Maps PostgreSQL constraint codes to human-readable 4xx responses
 * - Attaches X-Request-ID to every error response for log correlation
 * - Never leaks internal stack traces to API consumers in production
 */
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);
  private readonly isDev  = process.env.NODE_ENV !== 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const request  = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string) ??
      Math.random().toString(36).slice(2, 10).toUpperCase();

    const { status, message, code } = this.resolveError(exception);

    // Structured log — parseable by log aggregators
    const logPayload = {
      requestId,
      method:  request.method,
      path:    request.url,
      status,
      code,
      message,
      ...(this.isDev && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    };

    if (status >= 500) {
      this.logger.error(JSON.stringify(logPayload));
    } else if (status >= 400) {
      this.logger.warn(JSON.stringify(logPayload));
    }

    response
      .status(status)
      .header('X-Request-ID', requestId)
      .json({
        success:    false,
        statusCode: status,
        code,
        message,
        path:      request.url,
        timestamp: new Date().toISOString(),
        requestId,
        // Stack only in development — never in production
        ...(this.isDev && status >= 500 && exception instanceof Error
          ? { detail: exception.stack?.split('\n').slice(0, 5).join(' | ') }
          : {}),
      });
  }

  private resolveError(exception: unknown): {
    status: number;
    message: string;
    code: string;
  } {
    // ── NestJS HttpException ──────────────────────────────────────────────
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message  = typeof response === 'string'
        ? response
        : (response as any).message ?? exception.message;
      const msg = Array.isArray(message) ? message.join('; ') : String(message);
      return {
        status:  exception.getStatus(),
        message: msg,
        code:    this.toCode(exception.getStatus()),
      };
    }

    // ── TypeORM / PostgreSQL constraint errors ────────────────────────────
    if (exception instanceof QueryFailedError) {
      const pgCode = (exception as any).code as string;
      switch (pgCode) {
        case PG_UNIQUE_VIOLATION:
          return {
            status:  409,
            message: this.extractConstraintMessage(exception, 'This record already exists'),
            code:    'CONFLICT',
          };
        case PG_FK_VIOLATION:
          return {
            status:  400,
            message: 'Referenced record does not exist',
            code:    'FOREIGN_KEY_VIOLATION',
          };
        case PG_NOT_NULL_VIOLATION:
          return {
            status:  400,
            message: `Required field missing: ${(exception as any).column ?? 'unknown'}`,
            code:    'NOT_NULL_VIOLATION',
          };
        case PG_CHECK_VIOLATION:
          return {
            status:  400,
            message: 'Value failed validation constraint',
            code:    'CHECK_VIOLATION',
          };
        default:
          return {
            status:  500,
            message: this.isDev ? exception.message : 'Database error',
            code:    'DB_ERROR',
          };
      }
    }

    // ── Unknown / unexpected errors ───────────────────────────────────────
    const msg = exception instanceof Error ? exception.message : 'Internal server error';
    return {
      status:  HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isDev ? msg : 'Internal server error',
      code:    'INTERNAL_ERROR',
    };
  }

  private toCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? 'ERROR';
  }

  private extractConstraintMessage(err: QueryFailedError, fallback: string): string {
    // e.g. "Key (receipt_number)=(RCT-2026-123) already exists"
    const detail = (err as any).detail as string | undefined;
    if (detail) {
      const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
      if (match) return `${match[1]} '${match[2]}' already exists`;
    }
    return fallback;
  }
}
