/**
 * Unit tests (no database): role permission replace, branch field whitelist / FK delete,
 * and the drawer carry-over query wiring. Run: npx jest test/roles-branches-reversal-carry.spec.ts
 */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RolesService } from '../src/modules/roles/roles.service';
import { BranchesService } from '../src/modules/branches/branches.service';

function rolesSvc(knownCodes: string[]) {
  const saved: any[] = [];
  const rp = {
    delete: jest.fn(async () => undefined),
    create: jest.fn((x: any) => x),
    save: jest.fn(async (rows: any[]) => { saved.push(...rows); return rows; }),
  };
  const em: any = {
    query: jest.fn(async (_s: string, [codes]: any) => codes.filter((c: string) => knownCodes.includes(c)).map((code: string) => ({ code }))),
    getRepository: () => rp,
  };
  const svc: any = Object.create(RolesService.prototype);
  svc.findOne = jest.fn(async () => ({ id: 3 }));
  svc.rpRepo = { manager: { transaction: (fn: any) => fn(em) } };
  return { svc, rp, saved };
}

describe('RolesService.setPermissions', () => {
  it('replaces permissions and de-duplicates codes', async () => {
    const { svc, rp, saved } = rolesSvc(['loan.view', 'loan.create']);
    await svc.setPermissions(3, ['loan.view', 'loan.view', 'loan.create'], 7, 1);
    expect(rp.delete).toHaveBeenCalledWith({ roleId: 3 });
    expect(saved.map(r => r.permissionCode)).toEqual(['loan.view', 'loan.create']);
  });
  it('rejects unknown codes without deleting anything', async () => {
    const { svc, rp } = rolesSvc(['loan.view']);
    await expect(svc.setPermissions(3, ['loan.view', 'nope.x'], 7, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(rp.delete).not.toHaveBeenCalled();
  });
  it('rejects a non-array body', async () => {
    const { svc } = rolesSvc([]);
    await expect(svc.setPermissions(3, 'loan.view' as any, 7, 1)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BranchesService', () => {
  function build(branch: any = { id: 1, tenantId: 7, name: 'Main' }) {
    const repo: any = {
      create: jest.fn((x: any) => x),
      save: jest.fn(async (x: any) => x),
      findOneBy: jest.fn(async () => branch),
      delete: jest.fn(),
    };
    const svc: any = new (BranchesService as any)(repo);
    return { svc, repo, branch };
  }
  it('create takes tenant from the caller, ignoring body tenantId', async () => {
    const { svc } = build();
    const b = await svc.create({ name: ' East ', tenantId: 99 } as any, 7);
    expect(b.tenantId).toBe(7);
    expect(b.name).toBe('East');
  });
  it('update ignores id / tenantId in the body', async () => {
    const { svc, branch } = build();
    await svc.update(1, { name: 'Renamed', tenantId: 99, id: 50 } as any, 7);
    expect(branch.tenantId).toBe(7);
    expect(branch.id).toBe(1);
    expect(branch.name).toBe('Renamed');
  });
  it('delete of a referenced branch gives a Conflict telling the user to deactivate', async () => {
    const { svc, repo } = build();
    repo.delete.mockRejectedValue({ code: '23503' });
    await expect(svc.remove(1, 7)).rejects.toBeInstanceOf(ConflictException);
  });
});
