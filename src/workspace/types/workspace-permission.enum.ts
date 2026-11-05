/**
 * Workspace permissions for organization members.
 * Used by WorkspacePermissionsGuard to check access.
 */
export enum WorkspacePermissionEnum {
  // Team access - all roles
  ACCESS_TEAM = 'access_team',

  // Swap requests
  VIEW_ALL_SWAP_REQUESTS = 'view_all_swap_requests',
  VIEW_OWN_EMAIL_SWAP_REQUESTS = 'view_own_email_swap_requests',
  VIEW_SWAP_REQUESTS_READONLY = 'view_swap_requests_readonly',

  APPROVE_REJECT_SWAP = 'approve_reject_swap',
  OVERRIDE_DECISIONS = 'override_decisions',

  // Switcher profiles
  VIEW_ANONYMOUS_SWITCHER_PROFILES = 'view_anonymous_switcher_profiles',
  VIEW_PERSONAL_SWITCHER_DATA = 'view_personal_switcher_data',

  // Team management
  MANAGE_TEAM_USERS = 'manage_team_users',
  ASSIGN_ROLES = 'assign_roles',

  // Statistics & billing
  VIEW_AGGREGATED_STATISTICS = 'view_aggregated_statistics',
  ACCESS_BILLING = 'access_billing',
  VIEW_AUDIT_LOG = 'view_audit_log',

  // Ownership
  TRANSFER_OWNERSHIP = 'transfer_ownership',
}
