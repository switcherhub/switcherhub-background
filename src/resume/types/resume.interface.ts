import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { JobCoreInterface } from 'src/job-core/types/job-core.interface';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { WorkEnvironmentInterface } from 'src/work-environment/types/work-environment.interface';
import { ShiftTypeInterface } from 'src/shift-type/types/shift-type.interface';
import { LocationTenureInterface } from 'src/location-tenure/types/location-tenure.interface';
import { SameRoleCountInterface } from 'src/same-role-count/types/same-role-count.interface';
import { TimeToStartWorkingInterface } from 'src/time-to-start-working/types/time-to-start-working.interface';
import { LicenseRequiredInterface } from 'src/license-required/types/license-required.interface';

export interface ResumeInterface extends ParameterBaseInterface {
  id: string;
  firstName: string;

  user: UserInterface | null;

  salaryHourly: number | null;
  hoursPerMonth: number | null;

  allowChat: boolean;

  isHidden: boolean;
  isApproved: boolean;
  isActive: boolean;

  deletedAt: Date | null;
  noteDeletion: string | null;

  jobCore: JobCoreInterface;
  jobCoreId: string;

  jobType: JobTypeInterface | null;
  jobTypeId: string | null;

  workEnvironment: WorkEnvironmentInterface;
  workEnvironmentId: string;

  shiftType: ShiftTypeInterface;
  shiftTypeId: string;

  locationTenure: LocationTenureInterface;
  locationTenureId: string;

  sameRoleCount: SameRoleCountInterface;
  sameRoleCountId: string;

  timeToStartWorking: TimeToStartWorkingInterface;
  timeToStartWorkingId: string;

  licenseRequired: LicenseRequiredInterface;
  licenseRequiredId: string;

  location: LocationInterface | null;
  locationHome: LocationInterface | null;
  commuteDistanceKm: number | null;
  commuteDurationSeconds: number | null;

  showedContacts: number;
  views: number;
  chatsStarted: number;
  reviews: number;
}

export type ResumeKey = keyof ResumeInterface;
