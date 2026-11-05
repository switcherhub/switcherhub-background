import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { ParserInterface } from '../types/parser.interface';
import { CompanyInterface } from 'src/company/types/company.interface';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { Type } from 'class-transformer';
import { BenefitIdDto } from 'src/benefit/dto/benefit-id.dto';
import { PerkIdDto } from 'src/perk/dto/perk-id.dto';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { JobTypeIdDto } from 'src/job-type/dto/job-type-id.dto';
import { EducationInterface } from 'src/education/types/education.interface';

export class ParserCreateDto
  extends ParameterCreateDto
  implements ParserInterface
{
  @IsTrulyEmpty()
  @IsEmpty()
  education: EducationInterface;

  @IsNotEmpty()
  @IsString()
  brand: string;

  @IsNotEmpty()
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsTrulyEmpty()
  @IsEmpty()
  company: CompanyInterface;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  isHidden: boolean;

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

  @IsOptional()
  @IsUUID()
  educationId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => JobTypeIdDto)
  jobTypes: any[];

  @IsTrulyEmpty()
  @IsEmpty()
  isProcessing: boolean;

  @IsTrulyEmpty()
  @IsEmpty()
  lastProcessedAt: Date | null;

  @IsTrulyEmpty()
  @IsEmpty()
  startProcessingAt: Date | null;

  @IsTrulyEmpty()
  @IsEmpty()
  lastAddedCount: number;

  @IsTrulyEmpty()
  @IsEmpty()
  lastUpdatedCount: number;

  @IsTrulyEmpty()
  @IsEmpty()
  lastDeletedCount: number;

  @IsTrulyEmpty()
  @IsEmpty()
  totalParsedCount: number;
}
