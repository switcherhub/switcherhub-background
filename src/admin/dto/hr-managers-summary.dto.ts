export class HrManagersSummaryDto {
  total: number;
  approvedPaid: number;
  approvedPaidChange: string | null;
  pending: number;
  pendingNote: string | null;
  notApproved: number;
  rejectionRate: string;
}
