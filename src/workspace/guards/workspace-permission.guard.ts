import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspacePermissionEnum } from '../types/workspace-permission.enum';
import { WorkspaceService } from '../services/workspace.service';

export const WORKSPACE_PERMISSION_KEY = 'workspace_permission';
export const WORKSPACE_ID_PARAM = 'workspaceId';

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<WorkspacePermissionEnum>(
      WORKSPACE_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user?.user;

    if (!user) {
      return false;
    }

    const workspaceId =
      request.params[WORKSPACE_ID_PARAM] ||
      request.params['organizationId'] ||
      request.params['id'];

    if (!workspaceId) {
      return false;
    }

    return this.workspaceService.checkPermission(
      workspaceId,
      user.id,
      requiredPermission,
    );
  }
}
