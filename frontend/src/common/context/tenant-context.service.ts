/**
 * TenantContextService
 *
 * REQUEST-scoped service that holds the tenantId and branchId for the
 * current HTTP request. Populated by TenantMiddleware before any
 * controller/service runs.
 *
 * Inject this into any service that needs to stamp or filter by tenant:
 *
 *   constructor(private readonly tenantCtx: TenantContextService) {}
 *
 *   // Read context
 *   const tenantId  = this.tenantCtx.tenantId;   // default: 1
 *   const branchId  = this.tenantCtx.branchId;   // default: 1
 *
 * IMPORTANT: Because this service is REQUEST-scoped, every service that
 * injects it must also be REQUEST-scoped OR must declare the provider in
 * its module with { scope: Scope.REQUEST }.
 *
 * For convenience we currently default to (1,1) so existing single-tenant
 * data continues to work without any migration.
 */

import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private _tenantId: number = 1;
  private _branchId: number = 1;

  get tenantId(): number {
    return this._tenantId;
  }

  set tenantId(value: number) {
    this._tenantId = value;
  }

  get branchId(): number {
    return this._branchId;
  }

  set branchId(value: number) {
    this._branchId = value;
  }

  /** Convenience setter for both at once */
  setContext(tenantId: number, branchId: number): void {
    this._tenantId = tenantId;
    this._branchId = branchId;
  }
}
