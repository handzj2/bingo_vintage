import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/permission.guard';

export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);