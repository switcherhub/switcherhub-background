import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { ChatInterface } from '../types/chat.interface';
import { ArchiveReasonEnum } from '../types/archive-reason.enum';
import { IsEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';

export class ChatCreateDto extends ParameterCreateDto implements ChatInterface {
  @IsOptional()
  @IsUUID()
  targetSwapRequestId: string | null;

  @IsOptional()
  @IsEnum(ArchiveReasonEnum)
  archiveReasonOwner: ArchiveReasonEnum | null;

  @IsEmpty()
  @IsTrulyEmpty()
  archiveReasonParticipant: ArchiveReasonEnum;

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
