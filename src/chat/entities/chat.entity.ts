import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { ChatInterface } from '../types/chat.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { ArchiveReasonEnum } from '../types/archive-reason.enum';
import { MessageEntity } from 'src/message/entities/message.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';

@Entity('chat')
export class ChatEntity extends ParameterBaseEntity implements ChatInterface {
  @Column({
    nullable: true,
  })
  lastMessageText: string | null;

  @Column({
    nullable: true,
  })
  lastMessageAt: string | null;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ownerId' })
  owner: UserInterface;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: UserRoleEnum.CANDIDATE,
  })
  ownerAccountType: UserRoleEnum;

  @Column()
  ownerId: string;

  @Column({
    nullable: true,
  })
  deletedAtOwner: Date | null;

  @Column({
    default: 0,
  })
  ownerUreadMessagesCount: number;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'participantId' })
  participant: UserInterface;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: UserRoleEnum.CANDIDATE,
  })
  participantAccountType: UserRoleEnum;

  @Column()
  participantId: string;

  @Column({
    nullable: true,
  })
  deletedAtParticipant: Date | null;

  @Column({
    default: 0,
  })
  participantUreadMessagesCount: number;

  /** Зв'язок один-до-одного: один swap-request — один чат. */
  @OneToOne(() => SwapRequestEntity, (swapRequest) => swapRequest.chat, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'targetSwapRequestId' })
  targetSwapRequest: SwapRequestEntity | null;

  @Column({
    nullable: true,
    unique: true,
  })
  targetSwapRequestId: string | null;

  @Column({
    type: 'enum',
    enum: ArchiveReasonEnum,
    nullable: true,
  })
  archiveReasonOwner: ArchiveReasonEnum | null;

  @Column({
    type: 'enum',
    enum: ArchiveReasonEnum,
    nullable: true,
  })
  archiveReasonParticipant: ArchiveReasonEnum | null;

  @OneToMany(() => MessageEntity, (message) => message.chat, {
    cascade: true,
  })
  messages: MessageEntity[];

  @Column({
    nullable: true,
  })
  autoDeleteAt: Date | null;
}
