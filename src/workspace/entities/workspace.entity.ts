import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceInterface } from '../types/workspace.interface';
import { WorkspaceModeEnum } from '../types/workspace-mode.enum';
import { UserEntity } from 'src/users/entities/user.entity';
import { WorkspaceMemberEntity } from './workspace-member.entity';
import { WorkspacePaymentMethodEntity } from './workspace-payment-method.entity';

@Entity('workspace')
export class WorkspaceEntity implements WorkspaceInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: WorkspaceModeEnum,
    default: WorkspaceModeEnum.PERSONAL,
  })
  mode: WorkspaceModeEnum;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: UserEntity;

  @Column()
  ownerId: string;

  @OneToMany(() => WorkspaceMemberEntity, (member) => member.workspace, {
    cascade: ['remove'],
  })
  members: WorkspaceMemberEntity[];

  @OneToMany(
    () => WorkspacePaymentMethodEntity,
    (paymentMethod) => paymentMethod.workspace,
    {
      cascade: ['remove'],
    },
  )
  paymentMethods: WorkspacePaymentMethodEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
