import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Request ID middleware.
 *
 * Attaches a unique requestId to every request so that all log lines
 * from a single request can be correlated in Railway log stream or
 * any observability tool (Datadog, New Relic, Axiom).
 *
 * Pattern used by: Stripe, GitHub API, Cloudflare.
 * Header: X-Request-Id (echoed back in response for client-side correlation).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Accept from upstream (load balancer / Vercel) or generate
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
