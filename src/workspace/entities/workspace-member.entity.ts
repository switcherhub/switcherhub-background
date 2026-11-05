import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceMemberInterface } from '../types/workspace-member.interface';
import { OrganizationRoleEnum } from '../types/organization-role.enum';
import { WorkspaceEntity } from './workspace.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('workspace_member')
@Unique(['workspaceId', 'userId'])
export class WorkspaceMemberEntity implements WorkspaceMemberInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceEntity;

  @Column()
  workspaceId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: OrganizationRoleEnum,
  })
  role: OrganizationRoleEnum;

  @CreateDateColumn()
  invitedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: UserEntity | null;

  @Column({ nullable: true })
  invitedById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
