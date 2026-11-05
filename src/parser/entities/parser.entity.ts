import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { ParserInterface } from '../types/parser.interface';
import { CompanyInterface } from 'src/company/types/company.interface';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { CompanyEntity } from 'src/company/entities/company.entity';
import { BenefitEntity } from 'src/benefit/entities/benefit.entity';
import { JobTypeEntity } from 'src/job-type/entities/job-type.entity';
import { PerkEntity } from 'src/perk/entities/perk.entity';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { EducationEntity } from 'src/education/entities/education.entity';
import { EducationInterface } from 'src/education/types/education.interface';

@Entity('parser')
export class ParserEntity
  extends ParameterBaseEntity
  implements ParserInterface
{
  @Column()
  brand: string;

  @ManyToOne(() => CompanyEntity, (company) => company.id, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: CompanyInterface;

  @Column({
    nullable: true,
  })
  companyId: string | null;

  @Column({
    default: false,
  })
  active: boolean;

  @ManyToMany(() => JobTypeEntity, {
    eager: true,
  })
  @JoinTable()
  jobTypes: JobTypeInterface[];

  @Column({ nullable: true })
  description: string | null;

  @ManyToMany(() => PerkEntity, {
    eager: true,
  })
  @JoinTable()
  perks: PerkInterface[];

  @ManyToMany(() => BenefitEntity, {
    eager: true,
  })
  @JoinTable()
  benefits: PerkInterface[];

  @ManyToOne(() => EducationEntity, (education) => education.id)
  @JoinColumn({ name: 'educationId' })
  education: EducationInterface;

  @Column({ nullable: true })
  educationId: string | null;

  @Column({ default: false })
  isProcessing: boolean;

  @Column({ nullable: true })
  lastProcessedAt: Date | null;

  @Column({ default: 0 })
  lastAddedCount: number;

  @Column({ default: 0 })
  lastUpdatedCount: number;

  @Column({ default: 0 })
  lastDeletedCount: number;

  @Column({ default: 0 })
  totalParsedCount: number;

  @Column({ nullable: true })
  startProcessingAt: Date | null;
}
