import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>) {
    const entity = event.entity;
    if (entity && event.metadata.columns.some(col => col.propertyName === 'tenantId')) {
      if (!entity.tenantId && event.queryRunner?.data?.tenantId) {
        entity.tenantId = event.queryRunner.data.tenantId;
      }
    }
  }
}
// Register in TypeORM config (entities or subscribers array)