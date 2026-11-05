import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { VacancyInterface } from '../types/vacancy.interface';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { LocationInterface } from 'src/location/types/location.interface';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { LocationDto } from 'src/location/dto/location.dto';
import { JobTypeIdDto } from 'src/job-type/dto/job-type-id.dto';
import { IsValidPhoneNumber } from 'src/app/validators/phone';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { PerkIdDto } from 'src/perk/dto/perk-id.dto';
import { BenefitIdDto } from 'src/benefit/dto/benefit-id.dto';
import { SalaryTypeEnum } from 'src/salary/salary-type.enum';

export class VacancyCreateDto
  extends ParameterCreateDto
  implements VacancyInterface
{
  @IsOptional()
  @IsEnum(SalaryTypeEnum)
  salaryType: SalaryTypeEnum;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  industryId: string;

  @IsNotEmpty()
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

  @IsNotEmpty()
  @IsEnum(SalaryPeriodEnum)
  salaryPeriod: SalaryPeriodEnum;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
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
  benefits: PerkInterface[];

  @IsUUID()
  @IsNotEmpty()
  educationId: string;

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

  @IsNotEmpty()
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

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate: Date;

  @IsOptional()
  @IsBoolean()
  isHidden: boolean;

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

  @IsEmpty()
  @IsTrulyEmpty()
  isPremium: boolean;

  industry: undefined;
  company: undefined;
  workExpirience: undefined;
  education: undefined;
}
