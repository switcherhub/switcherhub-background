import { Injectable } from '@nestjs/common';
import { OrganizationRoleEnum } from '../types/organization-role.enum';
import { WorkspacePermissionEnum } from '../types/workspace-permission.enum';

/**
 * Maps organization roles to their permissions.
 * Owner has all permissions + transfer ownership.
 * When owner transfers ownership, they become Viewer.
 */
@Injectable()
export class WorkspacePermissionsService {
  private readonly rolePermissions: Record<
    OrganizationRoleEnum,
    WorkspacePermissionEnum[]
  > = {
    [OrganizationRoleEnum.OWNER]: [
      WorkspacePermissionEnum.ACCESS_TEAM,
      WorkspacePermissionEnum.VIEW_ALL_SWAP_REQUESTS,
      WorkspacePermissionEnum.APPROVE_REJECT_SWAP,
      WorkspacePermissionEnum.OVERRIDE_DECISIONS,
      WorkspacePermissionEnum.VIEW_ANONYMOUS_SWITCHER_PROFILES,
      WorkspacePermissionEnum.VIEW_PERSONAL_SWITCHER_DATA,
      WorkspacePermissionEnum.MANAGE_TEAM_USERS,
      WorkspacePermissionEnum.ASSIGN_ROLES,
      WorkspacePermissionEnum.VIEW_AGGREGATED_STATISTICS,
      WorkspacePermissionEnum.ACCESS_BILLING,
      WorkspacePermissionEnum.VIEW_AUDIT_LOG,
      WorkspacePermissionEnum.TRANSFER_OWNERSHIP,
    ],
    [OrganizationRoleEnum.ADMIN]: [
      WorkspacePermissionEnum.ACCESS_TEAM,
      WorkspacePermissionEnum.VIEW_ALL_SWAP_REQUESTS,
      WorkspacePermissionEnum.APPROVE_REJECT_SWAP,
      WorkspacePermissionEnum.OVERRIDE_DECISIONS,
      WorkspacePermissionEnum.VIEW_ANONYMOUS_SWITCHER_PROFILES,
      WorkspacePermissionEnum.VIEW_PERSONAL_SWITCHER_DATA,
      WorkspacePermissionEnum.MANAGE_TEAM_USERS,
      WorkspacePermissionEnum.ASSIGN_ROLES,
      WorkspacePermissionEnum.VIEW_AGGREGATED_STATISTICS,
      WorkspacePermissionEnum.ACCESS_BILLING,
      WorkspacePermissionEnum.VIEW_AUDIT_LOG,
    ],
    [OrganizationRoleEnum.HR]: [
      WorkspacePermissionEnum.ACCESS_TEAM,
      WorkspacePermissionEnum.VIEW_OWN_EMAIL_SWAP_REQUESTS,
      WorkspacePermissionEnum.APPROVE_REJECT_SWAP,
      WorkspacePermissionEnum.VIEW_ANONYMOUS_SWITCHER_PROFILES,
      WorkspacePermissionEnum.ACCESS_BILLING,
    ],
    [OrganizationRoleEnum.VIEWER]: [
      WorkspacePermissionEnum.ACCESS_TEAM,
      WorkspacePermissionEnum.VIEW_SWAP_REQUESTS_READONLY,
      WorkspacePermissionEnum.VIEW_AGGREGATED_STATISTICS,
      WorkspacePermissionEnum.VIEW_AUDIT_LOG,
    ],
  };

  hasPermission(
    role: OrganizationRoleEnum,
    permission: WorkspacePermissionEnum,
  ): boolean {
    return this.rolePermissions[role]?.includes(permission) ?? false;
  }

  getPermissionsForRole(role: OrganizationRoleEnum): WorkspacePermissionEnum[] {
    return this.rolePermissions[role] ?? [];
  }

  /**
   * Roles that can assign roles to others (Admin, Owner only).
   * HR and Viewer cannot assign roles.
   */
  canAssignRoles(role: OrganizationRoleEnum): boolean {
    return this.hasPermission(role, WorkspacePermissionEnum.ASSIGN_ROLES);
  }

  /**
   * Only Owner can transfer ownership.
   */
  canTransferOwnership(role: OrganizationRoleEnum): boolean {
    return this.hasPermission(role, WorkspacePermissionEnum.TRANSFER_OWNERSHIP);
  }

  /**
   * Roles that can manage (add/remove) team users.
   */
  canManageTeamUsers(role: OrganizationRoleEnum): boolean {
    return this.hasPermission(role, WorkspacePermissionEnum.MANAGE_TEAM_USERS);
  }

  /**
   * Roles that can remove members from organization.
   * Owner, Admin can remove. Owner cannot be removed except via ownership transfer.
   */
  canRemoveMember(role: OrganizationRoleEnum): boolean {
    return this.hasPermission(role, WorkspacePermissionEnum.MANAGE_TEAM_USERS);
  }
}
