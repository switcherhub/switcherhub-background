import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { ConsentPurposeEnum } from '../types/consent-purpose.enum';

/**
 * A single worker's explicit authorization, bound to a proposal_version (spec §8.1).
 * Invariants enforced by services (not the DB): employer delivery only when BOTH
 * workers have a current-version AUTHORIZE_EMPLOYER_CONTACT consent; changing key
 * terms bumps proposal_version and invalidates prior consents for it.
 */
@Entity('consent')
@Index(['swapRequestId', 'actorId', 'purpose', 'proposalVersion'])
export class ConsentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: UserEntity;

  @Column()
  actorId: string;

  @ManyToOne(() => SwapRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'swapRequestId' })
  swapRequest: SwapRequestEntity;

  @Column()
  swapRequestId: string;

  /** The proposal version this consent is valid for. */
  @Column({ type: 'int' })
  proposalVersion: number;

  @Column({ type: 'enum', enum: ConsentPurposeEnum })
  purpose: ConsentPurposeEnum;

  /** Who the disclosure is directed to (employer/HR id), for audit. */
  @Column({ nullable: true })
  recipientId: string | null;

  /** Exact fields allowed to be disclosed under this consent. */
  @Column({ type: 'jsonb', nullable: true })
  disclosureSnapshot: Record<string, unknown> | null;

  @CreateDateColumn()
  grantedAt: Date;

  /** When revoked (before send cancels the send). Null while active. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
