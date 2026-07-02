import { Injectable } from '@nestjs/common';
import { TenantLoanProductDto } from '../superadmin/dto/create-tenant.dto';

/**
 * LoanProductTemplateService — the single canonical source for default
 * loan product definitions.
 *
 * SuperadminService.createTenant() must never embed business values (rates,
 * fees, term limits) directly. When a tenant onboarding request omits
 * loanProducts entirely, this service is the one place that decides what a
 * new tenant gets by default. Changing the platform's default product
 * means changing this file — never the onboarding transaction itself.
 *
 * The values here intentionally match the platform-default settings already
 * seeded by SettingsService.seedForTenant() (LOAN_INTEREST_RATE=0.15,
 * LATE_FEE_DAILY=1000) — they are not independently invented numbers, they
 * exist here because a brand-new tenant has no app_settings rows yet at the
 * point createTenant()'s transaction needs them (the tenant itself doesn't
 * exist until that same transaction completes).
 */
@Injectable()
export class LoanProductTemplateService {
  getDefaultProducts(): TenantLoanProductDto[] {
    return [
      {
        name: 'Cash Loan',
        productType: 'cash',
        interestRate: 0.15,
        minTermMonths: 1,
        maxTermMonths: 60,
        minAmount: 0,
        processingFee: 0,
        lateFeeDaily: 1000,
        description: 'Standard cash disbursement loan, flat interest, monthly installments.',
      },
    ];
  }

  /**
   * Fills in any omitted field on a superadmin-supplied product definition
   * with the platform default for that field. This is the only place in
   * the codebase that knows what "0.15", "60", "1000" etc. mean as
   * business defaults — SuperAdminService must never embed these values,
   * whether for a whole omitted product list (getDefaultProducts) or a
   * single omitted field on an otherwise-explicit product (this method).
   */
  normalizeProduct(partial: TenantLoanProductDto): Required<Omit<TenantLoanProductDto, 'description'>> & { description: string | null } {
    return {
      name:           partial.name,
      productType:    partial.productType,
      interestRate:   partial.interestRate   ?? 0.15,
      minTermMonths:  partial.minTermMonths  ?? 1,
      maxTermMonths:  partial.maxTermMonths  ?? 60,
      minAmount:      partial.minAmount      ?? 0,
      maxAmount:      partial.maxAmount      ?? null as any,
      processingFee:  partial.processingFee  ?? 0,
      lateFeeDaily:   partial.lateFeeDaily   ?? 1000,
      description:    partial.description    ?? null,
    };
  }
}
