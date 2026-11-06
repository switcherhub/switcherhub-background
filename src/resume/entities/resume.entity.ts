import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { ResumeInterface } from '../types/resume.interface';
import { JobCoreEntity } from 'src/job-core/entities/job-core.entity';
import { JobCoreInterface } from 'src/job-core/types/job-core.interface';
import { JobTypeEntity } from 'src/job-type/entities/job-type.entity';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { WorkEnvironmentEntity } from 'src/work-environment/entities/work-environment.entity';
import { WorkEnvironmentInterface } from 'src/work-environment/types/work-environment.interface';
import { ShiftTypeEntity } from 'src/shift-type/entities/shift-type.entity';
import { ShiftTypeInterface } from 'src/shift-type/types/shift-type.interface';
import { LocationTenureEntity } from 'src/location-tenure/entities/location-tenure.entity';
import { LocationTenureInterface } from 'src/location-tenure/types/location-tenure.interface';
import { SameRoleCountEntity } from 'src/same-role-count/entities/same-role-count.entity';
import { SameRoleCountInterface } from 'src/same-role-count/types/same-role-count.interface';
import { TimeToStartWorkingEntity } from 'src/time-to-start-working/entities/time-to-start-working.entity';
import { TimeToStartWorkingInterface } from 'src/time-to-start-working/types/time-to-start-working.interface';
import { LicenseRequiredEntity } from 'src/license-required/entities/license-required.entity';
import { LicenseRequiredInterface } from 'src/license-required/types/license-required.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('resume')
export class ResumeEntity
  extends ParameterBaseEntity
  implements ResumeInterface
{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string | null;

  @Column({ nullable: true, type: 'float' })
  salaryHourly: number | null;

  @Column({ nullable: true, type: 'float' })
  hoursPerMonth: number | null;

  @Column({ default: true })
  allowChat: boolean;

  @Column({ default: true })
  isApproved: boolean;

  /** false = користувач «видалив» резюме (деактивація), рядок у БД лишається */
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @ManyToOne(() => JobCoreEntity, (jobCore) => jobCore.id)
  @JoinColumn({ name: 'jobCoreId' })
  jobCore: JobCoreInterface;

  @Column()
  jobCoreId: string;

  // ── New taxonomy fields (spec §3; value-first rework). Nullable for back-compat;
  // populated by onboarding v2 and the migration. categoryKey is DERIVED from roleKey.
  /** Canonical role_id from the roles taxonomy (null until migrated / set by v2 onboarding). */
  @Column({ nullable: true })
  roleKey: string | null;

  /** Derived top-level category key; never asked on the main path. */
  @Column({ nullable: true })
  categoryKey: string | null;

  /** Role specialization / disambiguation answer (spec §3.2.5). */
  @Column({ nullable: true })
  roleVariant: string | null;

  /** Taxonomy version this role was selected under. */
  @Column({ nullable: true })
  taxonomyVersion: string | null;

  /** Free-text / ambiguous role awaiting normalization; NOT matchable while true. */
  @Column({ default: false })
  rolePendingReview: boolean;

  // ── Swap-terms (spec §5 S05): the worker's MINIMUM acceptable conditions, kept
  // separate from current values. Null until collected → matching treats as unknown.
  /** Minimum acceptable guaranteed pay (USD/hour). */
  @Column({ type: 'float', nullable: true })
  minRate: number | null;

  /** Minimum acceptable weekly hours. */
  @Column({ type: 'float', nullable: true })
  minHours: number | null;

  /** Shifts the worker is available for (normalized, e.g. ['day','evening']). */
  @Column({ type: 'text', array: true, default: '{}' })
  availabilityShifts: string[];

  /** Explicit opt-in to change full-time/part-time in a swap. */
  @Column({ default: false })
  allowJobTypeChange: boolean;

  @ManyToOne(() => JobTypeEntity)
  @JoinColumn({ name: 'jobTypeId' })
  jobType: JobTypeInterface | null;

  @Column({ nullable: true })
  jobTypeId: string | null;

  @ManyToOne(
    () => WorkEnvironmentEntity,
    (workEnvironment) => workEnvironment.id,
  )
  @JoinColumn({ name: 'workEnvironmentId' })
  workEnvironment: WorkEnvironmentInterface;

  @Column()
  workEnvironmentId: string;

  @ManyToOne(() => ShiftTypeEntity, (shiftType) => shiftType.id)
  @JoinColumn({ name: 'shiftTypeId' })
  shiftType: ShiftTypeInterface;

  @Column()
  shiftTypeId: string;

  @ManyToOne(() => LocationTenureEntity, (locationTenure) => locationTenure.id)
  @JoinColumn({ name: 'locationTenureId' })
  locationTenure: LocationTenureInterface;

  @Column()
  locationTenureId: string;

  @ManyToOne(() => SameRoleCountEntity, (sameRoleCount) => sameRoleCount.id)
  @JoinColumn({ name: 'sameRoleCountId' })
  sameRoleCount: SameRoleCountInterface;

  @Column()
  sameRoleCountId: string;

  @ManyToOne(
    () => TimeToStartWorkingEntity,
    (timeToStartWorking) => timeToStartWorking.id,
  )
  @JoinColumn({ name: 'timeToStartWorkingId' })
  timeToStartWorking: TimeToStartWorkingInterface;

  @Column()
  timeToStartWorkingId: string;

  @ManyToOne(
    () => LicenseRequiredEntity,
    (licenseRequired) => licenseRequired.id,
  )
  @JoinColumn({ name: 'licenseRequiredId' })
  licenseRequired: LicenseRequiredInterface;

  @Column()
  licenseRequiredId: string;

  @Column({ type: 'jsonb', array: false, nullable: true })
  location: LocationInterface | null;

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

  @Column({ type: 'jsonb', array: false, nullable: true })
  locationHome: LocationInterface | null;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  locationHomePoint: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Column({ nullable: true })
  locationCity: string | null;

  @Column({ nullable: true })
  locationArea: string | null;

  @Column({ nullable: true })
  locationZipcode: string | null;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @BeforeInsert()
  setLatLng() {
    this.updateLatLng();
  }

  @BeforeUpdate()
  updateLatLng() {
    if (this.location && this.location.lat && this.location.lng) {
      this.lat = this.location.lat;
      this.lng = this.location.lng;

      this.locationPoint = {
        type: 'Point',
        coordinates: [this.lng, this.lat],
      };
    }

    if (this.locationHome && this.locationHome.lat && this.locationHome.lng) {
      this.locationHomePoint = {
        type: 'Point',
        coordinates: [this.locationHome.lng, this.locationHome.lat],
      };
    }
  }

  @BeforeInsert()
  setLocationPoint() {
    this.updateLocationPoint();
  }

  @BeforeUpdate()
  updateLocationPoint() {
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

  @Column({ type: 'float', nullable: true })
  commuteDistanceKm: number | null;

  @Column({ type: 'float', nullable: true })
  commuteDurationSeconds: number | null; 

  @Column({ type: 'enum', enum: UserRoleEnum, nullable: true, select: false })
  accountType: UserRoleEnum | null;


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

  reviews: number = 3;
}
