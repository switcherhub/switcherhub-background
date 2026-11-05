import { ParameterBaseInterface } from '../types/parameter.interface';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class ParameterBaseEntity implements ParameterBaseInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  title: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
