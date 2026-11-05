/**
 * Organization roles with permissions:
 *
 * Owner: Only one per organization. Can transfer ownership to another user (becomes Viewer).
 *
 * Admin: Full access except ownership transfer.
 * - Access to Team ✅
 * - View swap-requests (All) ✅
 * - Approve/Reject swap ✅
 * - Override decisions ✅
 * - View anonymous Switcher profiles ✅
 * - View personal Switcher data (after approve) ✅
 * - Manage Team users ✅
 * - Assign roles ✅
 * - View aggregated statistics ✅
 * - Access to billing ✅
 * - View audit log ✅
 *
 * HR: Limited access.
 * - Access to Team ✅
 * - View swap-requests (only with their email) ✅
 * - Approve/Reject swap ✅
 * - Override decisions ❌
 * - View anonymous Switcher profiles ✅
 * - View personal Switcher data ❌
 * - Manage Team users ❌
 * - Assign roles ❌
 * - View aggregated statistics ❌
 * - Access to billing ✅
 * - View audit log ❌
 *
 * Viewer: Read-only access.
 * - Access to Team ✅
 * - View swap-requests (Read-only) ✅
 * - Approve/Reject swap ❌
 * - Override decisions ❌
 * - View anonymous Switcher profiles ❌
 * - View personal Switcher data ❌
 * - Manage Team users ❌
 * - Assign roles ❌
 * - View aggregated statistics ✅
 * - Access to billing ❌
 * - View audit log ✅
 */
export enum OrganizationRoleEnum {
  OWNER = 'owner',
  ADMIN = 'admin',
  HR = 'hr',
  VIEWER = 'viewer',
}
