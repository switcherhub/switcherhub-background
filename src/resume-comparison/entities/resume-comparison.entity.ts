import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResumeEntity } from 'src/resume/entities/resume.entity';

@Entity('resume_comparison')
export class ResumeComparisonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ResumeEntity)
  @JoinColumn({ name: 'resumeAId' })
  resumeA: ResumeEntity;

  @Column()
  resumeAId: string;

  @ManyToOne(() => ResumeEntity)
  @JoinColumn({ name: 'resumeBId' })
  resumeB: ResumeEntity;

  @Column()
  resumeBId: string;

  // Distance data
  @Column({ type: 'float', nullable: true })
  distanceAToB: number | null; // Distance from resumeA.locationHome to resumeB.location

  @Column({ type: 'float', nullable: true })
  distanceBToA: number | null; // Distance from resumeB.locationHome to resumeA.location

  @Column({ type: 'float', nullable: true })
  durationAToB: number | null; // Duration in seconds from resumeA.locationHome to resumeB.location

  @Column({ type: 'float', nullable: true })
  durationBToA: number | null; // Duration in seconds from resumeB.locationHome to resumeA.location

  // Scoring data
  @Column({ type: 'jsonb', nullable: true })
  scores: {
    environment?: number | null;
    tenure?: number | null;
    team?: number | null;
    training?: number | null;
    license?: number | null;
    shift?: number | null;
    salary?: number | null;
    jobCore?: number | null; // Job Core score (always 1.0): 18%
    jobType?: number | null; // Job Type score (always 1.0): 2.25%
    commuteA?: number | null; // Score based on durationAToB (base home to around work): 10%
    commuteB?: number | null; // Score based on durationBToA (around home to base work): 10%
  } | null;

  @Column({ type: 'float', nullable: true })
  totalScore: number | null;

  // Filter results
  @Column({ default: false })
  passedSalaryFilter: boolean;

  @Column({ default: false })
  passedJobCoreFilter: boolean;

  @Column({ default: false })
  passedDistanceFilter: boolean;

  @Column({ default: false })
  passedDurationFilter: boolean;

  @Column({ default: false })
  passedAllFilters: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
