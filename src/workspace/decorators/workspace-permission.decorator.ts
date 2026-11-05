import { SetMetadata } from '@nestjs/common';
import { WORKSPACE_PERMISSION_KEY } from '../guards/workspace-permission.guard';
import { WorkspacePermissionEnum } from '../types/workspace-permission.enum';

export const RequireWorkspacePermission = (
  permission: WorkspacePermissionEnum,
) => SetMetadata(WORKSPACE_PERMISSION_KEY, permission);
