import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SwapRequestInterface } from '../types/swap-request.interface';
import { SwapComparisonInterface } from '../types/swap-comparison.interface';
import { SwapStatusEnum } from '../types/swap-status.enum';
import { HrDecisionEnum } from '../types/hr-decision.enum';
import { CancelledByTypeEnum } from '../types/cancelled-by-type.enum';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
import { ChatEntity } from 'src/chat/entities/chat.entity';

@Entity('swap_request')
export class SwapRequestEntity implements SwapRequestInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Числовий ID для зручного відображення (наприклад, #123). */
  @Column({ type: 'int', nullable: true, unique: true })
  numericId: number | null;

  /**
   * Current proposal version (spec §8.1). Incremented when key terms change;
   * worker consents and HR approvals are bound to a specific version. Starts at 1.
   */
  @Column({ type: 'int', default: 1 })
  proposalVersion: number;

  // ── Explicit HR decisions (spec §5 S10), separate from payment. Gated reveal.
  @Column({
    type: 'enum',
    enum: HrDecisionEnum,
    default: HrDecisionEnum.PENDING,
  })
  hrADecision: HrDecisionEnum;

  @Column({
    type: 'enum',
    enum: HrDecisionEnum,
    default: HrDecisionEnum.PENDING,
  })
  hrBDecision: HrDecisionEnum;

  @Column({ type: 'timestamptz', nullable: true })
  hrADecidedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  hrBDecidedAt: Date | null;

  // Optional HR note for a decline / clarification request (HR-facing only).
  @Column({ type: 'text', nullable: true })
  hrAReason: string | null;

  @Column({ type: 'text', nullable: true })
  hrBReason: string | null;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resumeAId' })
  resumeA: ResumeEntity;

  @Column()
  resumeAId: string;

  @ManyToOne(() => ResumeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resumeBId' })
  resumeB: ResumeEntity;

  @Column()
  resumeBId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'managerAId' })
  managerA: UserEntity | null;

  @Column({ nullable: true })
  managerAId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'managerBId' })
  managerB: UserEntity | null;

  @Column({ nullable: true })
  managerBId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity | null;

  @Column({ nullable: true })
  createdById: string | null;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'workspaceAId' })
  workspaceA: WorkspaceEntity | null;

  @Column({ nullable: true })
  workspaceAId: string | null;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'workspaceBId' })
  workspaceB: WorkspaceEntity | null;

  @Column({ nullable: true })
  workspaceBId: string | null;

  @Column({
    type: 'enum',
    enum: SwapStatusEnum,
    default: SwapStatusEnum.CREATED,
  })
  status: SwapStatusEnum;

  @Column({ nullable: true })
  description: string | null;

  @Column({ type: 'float', nullable: true })
  score: number | null;

  @Column({ type: 'jsonb', nullable: true })
  comparison: SwapComparisonInterface | null;

  // Participant A data
  @Column({ nullable: true })
  participantAFullName: string | null;

  @Column({ nullable: true })
  participantAPhone: string | null;

  @Column({ nullable: true })
  participantAPersonalEmail: string | null;

  @Column({ default: true })
  participantAConfirmed: boolean;

  /** Обчислюється: true, якщо контакти учасника A заповнені (не зберігається в БД). */
  get participantAContactConfirmed(): boolean {
    return !!(
      this.participantAFullName &&
      this.participantAPhone &&
      this.participantAPersonalEmail
    );
  }

  // Participant B data
  @Column({ nullable: true })
  participantBFullName: string | null;

  @Column({ nullable: true })
  participantBPhone: string | null;

  @Column({ nullable: true })
  participantBPersonalEmail: string | null;

  @Column({ default: false })
  participantBConfirmed: boolean;

  /** Обчислюється: true, якщо контакти учасника B заповнені (не зберігається в БД). */
  get participantBContactConfirmed(): boolean {
    return !!(
      this.participantBFullName &&
      this.participantBPhone &&
      this.participantBPersonalEmail
    );
  }

  // Manager A data (HR = Manager)
  @Column({ nullable: true })
  managerAEmail: string | null;

  @Column({ nullable: true, unique: true })
  managerACode: string | null;

  @Column({ default: false })
  managerAJoined: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  managerAJoinedAt: Date | null;

  @Column({ default: false })
  managerAConfirmed: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  managerAConfirmedAt: Date | null;

  @Column({ default: false })
  hrARead: boolean;

  // Manager B data (HR = Manager)
  @Column({ nullable: true })
  managerBEmail: string | null;

  @Column({ nullable: true, unique: true })
  managerBCode: string | null;

  @Column({ default: false })
  managerBJoined: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  managerBJoinedAt: Date | null;

  @Column({ default: false })
  managerBConfirmed: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  managerBConfirmedAt: Date | null;

  @Column({ default: false })
  hrBRead: boolean;

  // Payment data
  @Column({ nullable: true })
  stripePaymentIntentIdA: string | null;

  @Column({ nullable: true })
  stripePaymentIntentIdB: string | null;

  @Column({ default: false })
  paymentAHold: boolean;

  @Column({ default: false })
  paymentBHold: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  paymentAHoldAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  paymentBHoldAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  firstPaymentDate: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cancelledById' })
  cancelledBy: UserEntity | null;

  @Column({ nullable: true })
  cancelledById: string | null;

  @Column({
    type: 'enum',
    enum: CancelledByTypeEnum,
    nullable: true,
  })
  cancelledByType: CancelledByTypeEnum | null;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt: Date | null;

  /** Зв'язок один-до-одного: один swap-request — один чат (зворотний зв'язок). */
  @OneToOne(() => ChatEntity, (chat) => chat.targetSwapRequest)
  chat: ChatEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
