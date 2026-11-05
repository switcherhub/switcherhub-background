import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
} from 'typeorm';

import { OperatorRoleEnum } from '../types/operator-role.enum';
import { OperatorInterface } from '../types/operator.interface';
import { CredentialsEntity } from 'src/auth/entities/credentials.entity';

@Entity('operators')
export class OperatorEntity implements OperatorInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  fullName: string | null;

  @Column({ type: 'enum', enum: OperatorRoleEnum })
  role: OperatorRoleEnum;

  @Column({ default: false })
  deleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => CredentialsEntity, { eager: true })
  @JoinColumn()
  credentials: CredentialsEntity;

  registeredAt: Date | null;
  recoveryCode: string | null;

  @AfterLoad()
  setRegisteredAtFromCredentials() {
    if (this.credentials) {
      this.registeredAt = this.credentials.registeredAt;
      this.recoveryCode = this.credentials.recoveryCode;
      this.credentials = undefined;
    }
  }
}
