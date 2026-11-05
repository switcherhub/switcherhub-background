import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('configuration')
@Index(['type', 'name'], { unique: true })
export class ConfigurationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // e.g., 'scoring-matrix', 'settings', 'rules', etc.

  @Column()
  name: string; // e.g., 'job-core', 'work-environment', 'app-settings', etc.

  @Column({ type: 'jsonb' })
  data: Record<string, any>; // Flexible JSON data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


