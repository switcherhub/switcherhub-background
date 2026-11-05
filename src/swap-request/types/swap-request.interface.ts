import { SwapStatusEnum } from './swap-status.enum';
import { CancelledByTypeEnum } from './cancelled-by-type.enum';
import { SwapComparisonInterface } from './swap-comparison.interface';
import { ResumeInterface } from 'src/resume/types/resume.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';

export interface SwapRequestInterface {
  id: string;
  /** Числовий ID для зручного відображення (наприклад, #123). */
  numericId: number | null;
  resumeAId: string;
  resumeBId: string;
  managerAId: string | null;
  managerBId: string | null;
  createdById: string | null;
  workspaceAId: string | null;
  workspaceBId: string | null;
  status: SwapStatusEnum;
  description: string | null;
  score: number | null;
  comparison: SwapComparisonInterface | null;
  

  // Participant A data
  participantAFullName: string | null;
  participantAPhone: string | null;
  participantAPersonalEmail: string | null;
  participantAConfirmed: boolean;
  /** true, якщо контакти учасника A заповнені (геттер на entity). */
  participantAContactConfirmed: boolean;

  // Participant B data
  participantBFullName: string | null;
  participantBPhone: string | null;
  participantBPersonalEmail: string | null;
  participantBConfirmed: boolean;
  /** true, якщо контакти учасника B заповнені (геттер на entity). */
  participantBContactConfirmed: boolean;

  // Manager A data (HR = Manager)
  managerAEmail: string | null;
  managerACode: string | null;
  managerAJoined: boolean;
  managerAJoinedAt: Date | null;
  managerAConfirmed: boolean;
  managerAConfirmedAt: Date | null;
  hrARead: boolean;

  // Manager B data (HR = Manager)
  managerBEmail: string | null;
  managerBCode: string | null;
  managerBJoined: boolean;
  managerBJoinedAt: Date | null;
  managerBConfirmed: boolean;
  managerBConfirmedAt: Date | null;
  hrBRead: boolean;

  // Payment data
  stripePaymentIntentIdA: string | null;
  stripePaymentIntentIdB: string | null;
  paymentAHold: boolean;
  paymentBHold: boolean;
  paymentAHoldAt: Date | null;
  paymentBHoldAt: Date | null;
  firstPaymentDate: Date | null;
  completedAt: Date | null;

  // Cancellation data
  cancelledById: string | null;
  cancelledByType: CancelledByTypeEnum | null;
  cancelledAt: Date | null;

  // Relations
  resumeA: ResumeInterface;
  resumeB: ResumeInterface;
  managerA: UserInterface | null;
  managerB: UserInterface | null;
  createdBy: UserInterface | null;
  cancelledBy: UserInterface | null;

  createdAt: Date;
  updatedAt: Date;
}
