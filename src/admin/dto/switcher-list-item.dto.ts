export type SwitcherAdminStatus = 'active' | 'blocked';

export class SwitcherPositionDto {
  lines: string[];
  resumeCount: number;
}

export class SwitcherResumeDto {
  id: string;
  lines: string[];
  isActive: boolean;
}

export class SwitcherHrManagerDto {
  email: string | null;
  code: string | null;
  organizationName: string | null;
  planLabel: string | null;
  isBlocked: boolean;
}

export class SwitcherRequestStatsDto {
  total: number;
  pending: number;
  inPayment: number;
  rejected: number;
  lastRejectedAt: string | null;
  pendingSince: string | null;
  pendingIsStuck: boolean;
  successfulSwapAt: string | null;
  note: string | null;
}

export class SwitcherAppUsageDto {
  platform: 'iOS' | 'Android' | null;
  opensThisMonth: number | null;
  lastOpenLabel: string | null;
  isBlocked: boolean;
}

export class SwitcherActivityDto {
  label: string | null;
  detail: string | null;
  isWarning: boolean;
}

export class SwitcherListItemDto {
  id: string;
  code: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: SwitcherAdminStatus;
  position: SwitcherPositionDto;
  resumes: SwitcherResumeDto[];
  hrManager: SwitcherHrManagerDto | null;
  requests: SwitcherRequestStatsDto;
  app: SwitcherAppUsageDto;
  activity: SwitcherActivityDto;
}
