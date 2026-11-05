import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { VacancyInterface } from '../types/vacancy.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/location/dto/location.dto';
import { JobTypeIdDto } from 'src/job-type/dto/job-type-id.dto';
import { IsValidPhoneNumber } from 'src/app/validators/phone';
import { PerkIdDto } from 'src/perk/dto/perk-id.dto';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { BenefitInterface } from 'src/benefit/types/benefit.interface';
import { BenefitIdDto } from 'src/benefit/dto/benefit-id.dto';
import { SalaryTypeEnum } from 'src/salary/salary-type.enum';

export class VacancyUpdateDto
  extends ParameterUpdateDto
  implements VacancyInterface
{
  @IsOptional()
  @IsEnum(SalaryTypeEnum)
  salaryType: SalaryTypeEnum;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  industryId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => JobTypeIdDto)
  jobTypes: any[];

  @IsOptional()
  @IsNumber()
  minSalaryRange: number | null;

  @IsOptional()
  @IsNumber()
  maxSalaryRange: number | null;

  @IsOptional()
  @IsEnum(SalaryPeriodEnum)
  salaryPeriod: SalaryPeriodEnum;

  @IsOptional()
  @IsString()
  description: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationInterface | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PerkIdDto)
  perks: PerkInterface[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BenefitIdDto)
  benefits: BenefitInterface[];

  @IsOptional()
  @IsString()
  departament: string | null;

  @IsOptional()
  @IsUUID()
  workExpirienceId: string;

  @IsOptional()
  @IsString()
  responsibilities: string;

  @IsOptional()
  @IsString()
  requirements: string;

  @IsOptional()
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsString()
  applicationLink: string;

  @IsOptional()
  @IsString()
  contactPerson: string;

  @IsOptional()
  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsValidPhoneNumber()
  contactPhone: string;

  @IsOptional()
  @IsBoolean()
  allowChat: boolean;

  @IsUUID()
  @IsOptional()
  educationId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate: Date;

  @IsOptional()
  @IsBoolean()
  isHidden: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  isPremium: boolean;

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

  @IsTrulyEmpty()
  @IsEmpty()
  user: UserInterface | null;

  @IsTrulyEmpty()
  @IsEmpty()
  parserId: string | null;

  industry: undefined;
  company: undefined;
  education: undefined;
  workExpirience: undefined;
}
