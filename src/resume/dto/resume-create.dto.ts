import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { ResumeInterface } from '../types/resume.interface';
import {

  IsBoolean,
  IsDate,
  IsEmpty,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { LocationInterface } from 'src/location/types/location.interface';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';

import { UserInterface } from 'src/users/interfaces/user.interface';
import { LocationDto } from 'src/location/dto/location.dto';
import { Type } from 'class-transformer';

export class ResumeCreateDto
  extends ParameterCreateDto
  implements ResumeInterface
{
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
  jobCoreId: string;

  @IsUUID()
  @IsOptional()
  jobTypeId: string | null;

  @IsUUID()
  @IsNotEmpty()
  workEnvironmentId: string;

  @IsUUID()
  @IsNotEmpty()
  shiftTypeId: string;

  @IsUUID()
  @IsNotEmpty()
  locationTenureId: string;

  @IsUUID()
  @IsNotEmpty()
  sameRoleCountId: string;

  @IsUUID()
  @IsNotEmpty()
  timeToStartWorkingId: string;

  @IsUUID()
  @IsNotEmpty()
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

  @IsTrulyEmpty()
  @IsEmpty()
  isApproved: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  noteDeletion: string;

  @IsEmpty()
  @IsTrulyEmpty()
  title: string;

  @IsTrulyEmpty()
  @IsEmpty()
  user: UserInterface | null;

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
