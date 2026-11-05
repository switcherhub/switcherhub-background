import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleSupportStatusEnum } from '../types/role-support-status.enum';

/**
 * Canonical role (spec §3.3). `key` is the stable role_id used by matching.
 * Category is derived from the role (categoryKey), never asked on the main path.
 */
@Entity('role')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  key: string;

  /** English label (US market). */
  @Column({ default: '' })
  titleEn: string;

  /** Derived top-level category key (one of the 7 + other). */
  @Index()
  @Column()
  categoryKey: string;

  /** Search synonyms/aliases (lowercased, trimmed) for role search. */
  @Column({ type: 'text', array: true, default: '{}' })
  aliases: string[];

  /** Clarification options when the title is ambiguous (spec §3.2.5). */
  @Column({ type: 'text', array: true, default: '{}' })
  variants: string[];

  @Column({
    type: 'enum',
    enum: RoleSupportStatusEnum,
    default: RoleSupportStatusEnum.SUPPORTED,
  })
  supportStatus: RoleSupportStatusEnum;

  @Column({ default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
