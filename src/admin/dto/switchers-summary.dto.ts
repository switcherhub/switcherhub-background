export class SwitchersSummaryDto {
  total: number;
  totalChange: string | null;
  active: number;
  activePercent: string;
  activeChange: string | null;
  swapRequestsThisMonth: number;
  swapRequestsChange: string | null;
  pending: number;
  pendingNote: string | null;
  successfulSwaps: number;
  successfulSwapsChange: string | null;
  blocked: number;
  blockedNote: string | null;
}
