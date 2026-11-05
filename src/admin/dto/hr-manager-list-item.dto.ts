export type HrManagerAdminRole = 'admin' | 'hr' | 'viewer';

export type HrManagerAdminStatus = 'active' | 'alert' | 'inactive';

export class HrManagerStatsDto {
  approved: number;
  rejected: number;
  pending: number;
  successfulSwaps: number;
  stuckPending: boolean;
}

export class HrManagerRevenueDto {
  amount: number | null;
  description: string;
}

export class HrManagerActivityDto {
  lastActionAt: string | null;
  lastAction: string | null;
  detail: string | null;
  isWarning: boolean;
}

export class HrManagerListItemDto {
  id: string;
  userId: string;
  code: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: HrManagerAdminRole;
  status: HrManagerAdminStatus;
  organization: {
    id: string;
    name: string;
  };
  isSystemAdmin: boolean;
  alertMessage: string | null;
  stats: HrManagerStatsDto;
  revenue: HrManagerRevenueDto;
  activity: HrManagerActivityDto;
}
