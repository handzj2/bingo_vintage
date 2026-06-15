import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private dataSource: DataSource) {}

  async use(req: any, res: Response, next: NextFunction) {
    if (req.user) {
      req.tenantId = req.user.tenantId;
      req.branchId = req.user.branchId;
      // Attach query runner with tenant context
      const queryRunner = this.dataSource.createQueryRunner();
      req.queryRunner = queryRunner;
      req.queryRunner.data = { tenantId: req.user.tenantId };
    }
    next();
  }
}
// Register in AppModule: consumer.apply(TenantMiddleware).forRoutes('*');