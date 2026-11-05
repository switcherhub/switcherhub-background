import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { VacancyInterface } from '../types/vacancy.interface';

import { IndustryInterface } from 'src/industry/types/industry.interface';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { JobTypeEntity } from 'src/job-type/entities/job-type.entity';
import { IndustryEntity } from 'src/industry/entities/industry.entity';
import { LocationInterface } from 'src/location/types/location.interface';
import { getEnumValues } from 'src/utils/getEnumValues';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { convertSalary } from 'src/salary/convertSalary';
import { UserEntity } from 'src/users/entities/user.entity';
import { CompanyInterface } from 'src/company/types/company.interface';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { WorkExpirianceInterface } from 'src/work-expiriance/types/work-expiriance.interface';
import { PerkEntity } from 'src/perk/entities/perk.entity';
import { WorkExpirianceEntity } from 'src/work-expiriance/entities/work-expiriance.entity';
import { CompanyEntity } from 'src/company/entities/company.entity';
import { BenefitEntity } from 'src/benefit/entities/benefit.entity';
import { EducationEntity } from 'src/education/entities/education.entity';
import { EducationInterface } from 'src/education/types/education.interface';
import { SalaryTypeEnum } from 'src/salary/salary-type.enum';

@Index('idx_vacancy_company_active_exp', [
  'companyId',
  'isApproved',
  'isHidden',
  'expirationDate',
])
@Index('idx_vacancy_company', ['companyId'])
@Index('idx_vacancy_industry', ['industryId'])
@Index('idx_vacancy_education', ['educationId'])
@Index('idx_vacancy_workexp', ['workExpirienceId'])
@Index('idx_vacancy_user', ['userId'])
@Index('idx_vacancy_expiration', ['expirationDate'])
@Index('idx_vacancy_status_flags', ['isApproved', 'isHidden', 'isPremium'])
@Index('idx_vacancy_city', ['locationCity'])
@Index('idx_vacancy_area', ['locationArea'])
@Index('idx_vacancy_zip', ['locationZipcode'])
@Entity('vacancy')
export class VacancyEntity
  extends ParameterBaseEntity
  implements VacancyInterface
{
  @Column()
  description: string;

  @Column({ nullable: true })
  parserId: string | null;

  @Column({ nullable: true })
  responsibilities: string | null;

  @Column({ nullable: true })
  requirements: string | null;

  @Column({ default: true })
  applicationLink: string | null;

  @Column({ default: true })
  contactPerson: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  contactEmail: string | null;

  @Column({ nullable: true })
  contactPhone: string | null;

  @Column({
    type: 'enum',
    enum: SalaryTypeEnum,
    default: SalaryTypeEnum.NONE,
  })
  salaryType: SalaryTypeEnum;

  @Column({ nullable: true, type: 'float' })
  minSalaryRange: number | null;

  @Column({ nullable: true, type: 'float' })
  maxSalaryRange: number | null;

  @Column({ nullable: true })
  departament: string | null;

  @Column({ default: true })
  allowChat: boolean;

  @Column({ default: true })
  isApproved: boolean;

  @ManyToOne(() => EducationEntity, (education) => education.id)
  @JoinColumn({ name: 'educationId' })
  education: EducationInterface;

  @Column({ nullable: true })
  educationId: string | null;

  @Column({ default: false })
  isHidden: boolean;

  @Column({
    type: 'timestamp',
    default: () => "CURRENT_TIMESTAMP + INTERVAL '14 days'",
    nullable: true,
  })
  expirationDate: Date;

  @ManyToMany(() => JobTypeEntity)
  @JoinTable()
  jobTypes: JobTypeInterface[];

  @ManyToMany(() => PerkEntity)
  @JoinTable()
  perks: PerkInterface[];

  @ManyToMany(() => BenefitEntity)
  @JoinTable()
  benefits: PerkInterface[];

  @ManyToOne(() => IndustryEntity, (industry) => industry.id)
  @JoinColumn({ name: 'industryId' })
  industry: IndustryInterface;

  @Column({ nullable: true })
  industryId: string;

  @ManyToOne(() => CompanyEntity, (company) => company.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: CompanyInterface;

  @Column()
  companyId: string;

  @ManyToOne(() => WorkExpirianceEntity, (work) => work.id)
  @JoinColumn({ name: 'workExpirienceId' })
  workExpirience: WorkExpirianceInterface | null;

  @Column({ nullable: true })
  workExpirienceId: string | null;

  @Column({ type: 'jsonb', array: false })
  location: LocationInterface;

  @Column({ nullable: true })
  locationCity: string;

  @Column({ nullable: true })
  locationArea: string;

  @Column({ nullable: true })
  locationZipcode: string;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  locationPoint: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Column({ default: false })
  isPremium: boolean;

  @BeforeInsert()
  setLatLng() {
    this.updateLatLng();
  }

  @BeforeUpdate()
  updateLatLng() {
    // console.log('updateLatLng', this.location);
    if (this.location && this.location.lat && this.location.lng) {
      this.lat = this.location.lat;
      this.lng = this.location.lng;

      this.locationPoint = {
        type: 'Point',
        coordinates: [this.lng, this.lat], // важливо: lng перший
      };
    }
  }

  @BeforeInsert()
  setLocationPoint() {
    this.updateLocationPoint();
  }

  @BeforeUpdate()
  updateLocationPoint() {
    // console.log('updateLocationPoint', this.location);
    if (this.location) {
      if (this.location.city) {
        this.locationCity = this.location.city;
      }

      if (this.location.zipCode) {
        this.locationZipcode = this.location.zipCode;
      }

      if (this.location.area) {
        this.locationArea = this.location.area;
      }
    }
  }

  @Column({
    type: 'enum',
    enum: SalaryPeriodEnum,
    default: SalaryPeriodEnum.HOURLY,
  })
  salaryPeriod: SalaryPeriodEnum;

  @Column({ nullable: true })
  noteDeletion: string | null;

  @ManyToOne(() => UserEntity, (user) => user.resumes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
  })
  user: UserEntity | null;

  @Column({ nullable: true })
  userId: string | null;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  showedContacts: number;

  @Column({ default: 0 })
  chatsStarted: number;

  @AfterLoad()
  afterLoad() {
    if (this.minSalaryRange) {
      this.minSalaryRangePeriods = getSalaryForPeriods(this.minSalaryRange);
    }

    if (this.maxSalaryRange) {
      this.maxSalaryRangePeriods = getSalaryForPeriods(this.maxSalaryRange);
    }
  }

  minSalaryRangePeriods: any = null;
  maxSalaryRangePeriods: any = null;

  reviews: number = 3;
}

function getSalaryForPeriods(value: number) {
  return Object.fromEntries(
    getEnumValues(SalaryPeriodEnum).map((period) => [
      period,
      convertSalary(SalaryPeriodEnum.HOURLY, period, value),
    ]),
  );
}
