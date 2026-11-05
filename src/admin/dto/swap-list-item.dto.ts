export type SwapAdminPaymentStatus =
  | 'paid'
  | 'pending'
  | 'partial'
  | 'overdue'
  | 'cancelled';

export type SwapAdminTier = 'partner' | 'mixed' | 'standard';

export type SwapCompanyTier = 'partner' | 'standard';

export type SwapInvoiceStatus = 'paid' | 'pending' | 'overdue' | 'waived';

export class SwapParticipantDto {
  switcherCode: string;
  userId: string | null;
  displayName: string | null;
  email: string | null;
}

export class SwapHrManagerDto {
  code: string | null;
  userId: string | null;
  displayName: string | null;
  email: string | null;
  organizationName: string | null;
}

export class SwapCompanyDto {
  name: string;
  initials: string;
  tier: SwapCompanyTier;
}

export class SwapPositionDto {
  title: string | null;
  subtitle: string | null;
  route: string | null;
}

export class SwapRevenueDto {
  totalCents: number;
  collectedCents: number;
  breakdownLabel: string | null;
  progressLabel: string | null;
  isWaived: boolean;
}

export class SwapInvoiceDto {
  id: string;
  side: 'A' | 'B';
  organizationName: string | null;
  hrCode: string | null;
  hrEmail: string | null;
  amountCents: number;
  amountLabel: string;
  rateLabel: string;
  tier: SwapCompanyTier;
  status: SwapInvoiceStatus;
  dueAt: string | null;
  paidAt: string | null;
  overdueDays: number | null;
  remindersCount: number;
  lastReminderLabel: string | null;
  waivedReason: string | null;
}

export class SwapListItemDto {
  id: string;
  code: string;
  createdAt: string;
  participantA: SwapParticipantDto;
  participantB: SwapParticipantDto;
  hrManagerA: SwapHrManagerDto;
  hrManagerB: SwapHrManagerDto;
  companyA: SwapCompanyDto;
  companyB: SwapCompanyDto;
  position: SwapPositionDto;
  revenue: SwapRevenueDto;
  paymentStatus: SwapAdminPaymentStatus;
  paymentStatusDetail: string | null;
  tier: SwapAdminTier;
  isDisputed: boolean;
  disputeNote: string | null;
  invoices: SwapInvoiceDto[];
  collectionSummary: string | null;
  completedInDays: number | null;
  cancellationNote: string | null;
}
