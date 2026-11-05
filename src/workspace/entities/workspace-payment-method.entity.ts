import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceEntity } from './workspace.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('workspace_payment_method')
export class WorkspacePaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceEntity;

  @Column()
  workspaceId: string;

  // Stripe Payment Method ID
  @Column({ unique: true })
  stripePaymentMethodId: string;

  // Stripe Customer ID (for the workspace)
  @Column({ nullable: true })
  stripeCustomerId: string | null;

  // Payment method type (card, bank_account, etc.)
  @Column()
  type: string;

  // Card details (if type is card)
  @Column({ type: 'json', nullable: true })
  cardDetails: {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  } | null;

  // Whether this is the default payment method
  @Column({ default: false })
  isDefault: boolean;

  // User who added this payment method
  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'addedById' })
  addedBy: UserEntity | null;

  @Column({ nullable: true })
  addedById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
