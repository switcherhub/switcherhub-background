import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { ArchiveReasonEnum } from './archive-reason.enum';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';

export interface ChatInterface extends ParameterBaseInterface {
  lastMessageText: string | null;
  lastMessageAt: string | null;

  owner: UserInterface;
  ownerId: string;
  ownerUreadMessagesCount: number;
  archiveReasonOwner: ArchiveReasonEnum | null;
  deletedAtOwner: Date | null;
  ownerAccountType: UserRoleEnum;

  participant: UserInterface;
  participantId: string;
  participantUreadMessagesCount: number;
  archiveReasonParticipant: ArchiveReasonEnum | null;
  deletedAtParticipant: Date | null;
  participantAccountType: UserRoleEnum;

  targetSwapRequestId: string | null;

  autoDeleteAt: Date | null;
}
