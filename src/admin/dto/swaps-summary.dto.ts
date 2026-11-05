export class SwapsSummaryDto {
  total: number;
  totalChange: string | null;
  executed: number;
  executedPercent: string;
  invoiceCount: number;
  pendingPayment: number;
  pendingAmountLabel: string | null;
  overdue: number;
  overdueNote: string | null;
  revenueAllTime: number;
  revenueChange: string | null;
  revenueThisMonth: number;
  revenueThisMonthNote: string | null;
}
