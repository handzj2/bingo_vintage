// src/modules/loans/exceptions/policy-violation.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class PolicyViolationException extends HttpException {
  constructor(action: string) {
    super(
      `Governance Policy [2026-01-10]: ${action} is strictly prohibited for non-admin users.`,
      HttpStatus.FORBIDDEN,
    );
  }
}