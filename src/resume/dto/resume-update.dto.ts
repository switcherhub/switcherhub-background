import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { ResumeInterface } from '../types/resume.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import {
  IsBoolean,
  IsDate,
  IsEmpty,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/location/dto/location.dto';

export class ResumeUpdateDto
  extends ParameterUpdateDto
  implements ResumeInterface
{
  @IsOptional()
  @IsString()
  firstName: string;

  @IsNumber()
  @IsOptional()
  salaryHourly: number | null;

  @IsNumber()
  @IsOptional()
  hoursPerMonth: number | null;

  @IsBoolean()
  @IsOptional()
  allowChat: boolean;

  @IsUUID()
  @IsOptional()
  jobCoreId: string;

  @IsUUID()
  @IsOptional()
  jobTypeId: string;

  @IsUUID()
  @IsOptional()
  workEnvironmentId: string;

  @IsUUID()
  @IsOptional()
  shiftTypeId: string;

  @IsUUID()
  @IsOptional()
  locationTenureId: string;

  @IsUUID()
  @IsOptional()
  sameRoleCountId: string;

  @IsUUID()
  @IsOptional()
  timeToStartWorkingId: string;

  @IsUUID()
  @IsOptional()
  licenseRequiredId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationInterface | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  locationHome: LocationInterface | null;

  @IsNumber()
  @IsOptional()
  @IsBoolean()
  isHidden: boolean;

  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @IsTrulyEmpty()
  @IsEmpty()
  isApproved: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  noteDeletion: string;

  @IsTrulyEmpty()
  @IsEmpty()
  user: UserInterface | null;

  @IsEmpty()
  @IsTrulyEmpty()
  showedContacts: number;

  @IsEmpty()
  @IsTrulyEmpty()
  views: number;

  @IsEmpty()
  @IsTrulyEmpty()
  chatsStarted: number;

  @IsEmpty()
  @IsTrulyEmpty()
  reviews: number;

  @IsEmpty()
  @IsTrulyEmpty()
  title: string;

  jobCore: undefined;
  jobType: undefined;
  workEnvironment: undefined;
  shiftType: undefined;
  locationTenure: undefined;
  sameRoleCount: undefined;
  timeToStartWorking: undefined;
  licenseRequired: undefined;

  // Auto-calculated fields (not in DTO)
  commuteDistanceKm: undefined;
  commuteDurationSeconds: undefined;
}
