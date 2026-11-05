import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CredentialsInterface } from '../types/credentials.interface';

@Entity('credentials')
export class CredentialsEntity implements CredentialsInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ nullable: true })
  accessToken: string | null;

  @Column({ nullable: true })
  recoveryCode: string | null;

  @Column({
    default: () => 'CURRENT_TIMESTAMP',
  })
  recoveryCodeExpires: Date;

  @Column({ nullable: true })
  registeredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
