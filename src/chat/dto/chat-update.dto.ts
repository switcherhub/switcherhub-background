import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { ChatInterface } from '../types/chat.interface';
import { IsOptional, IsEmpty, IsEnum } from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { ArchiveReasonEnum } from '../types/archive-reason.enum';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';

export class ChatUpdateDto extends ParameterUpdateDto implements ChatInterface {
  @IsOptional()
  @IsEnum(ArchiveReasonEnum)
  archiveReasonOwner: ArchiveReasonEnum | null;

  @IsOptional()
  @IsEnum(ArchiveReasonEnum)
  archiveReasonParticipant: ArchiveReasonEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  targetSwapRequestId: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  lastMessageText: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  lastMessageAt: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  participantUreadMessagesCount: number;

  @IsEmpty()
  @IsTrulyEmpty()
  ownerUreadMessagesCount: number;

  @IsEmpty()
  @IsTrulyEmpty()
  participant: ChatInterface['participant'];

  @IsEmpty()
  @IsTrulyEmpty()
  owner: ChatInterface['owner'];

  @IsEmpty()
  @IsTrulyEmpty()
  participantId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  ownerId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  deletedAtOwner: Date | null;

  @IsEmpty()
  @IsTrulyEmpty()
  deletedAtParticipant: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  ownerAccountType: UserRoleEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  participantAccountType: UserRoleEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  autoDeleteAt: Date | null;
}
