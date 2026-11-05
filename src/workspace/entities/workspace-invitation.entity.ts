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
import { OrganizationRoleEnum } from '../types/organization-role.enum';

export enum WorkspaceInvitationStatusEnum {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('workspace_invitation')
export class WorkspaceInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceEntity;

  @Column()
  workspaceId: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: OrganizationRoleEnum,
  })
  role: OrganizationRoleEnum;

  @Column({
    type: 'enum',
    enum: WorkspaceInvitationStatusEnum,
    default: WorkspaceInvitationStatusEnum.PENDING,
  })
  status: WorkspaceInvitationStatusEnum;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: UserEntity;

  @Column()
  invitedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
