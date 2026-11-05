import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Top-level functional category (spec §3.1): 7 real categories + `other`.
 * `key` (e.g. retail_customer_service) is stable and never translated/shown as a label.
 */
@Entity('role_category')
export class RoleCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  /** English label (US market). */
  @Column({ default: '' })
  titleEn: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
