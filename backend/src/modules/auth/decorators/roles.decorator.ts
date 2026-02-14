import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Keeping this as string[] prevents the Enum mismatch error you faced
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);