import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { ParserInterface } from '../types/parser.interface';
import { CompanyInterface } from 'src/company/types/company.interface';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { Type } from 'class-transformer';
import { BenefitIdDto } from 'src/benefit/dto/benefit-id.dto';
import { BenefitInterface } from 'src/benefit/types/benefit.interface';
import { PerkIdDto } from 'src/perk/dto/perk-id.dto';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { EducationInterface } from 'src/education/types/education.interface';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { JobTypeIdDto } from 'src/job-type/dto/job-type-id.dto';

export class ParserUpdateDto
  extends ParameterUpdateDto
  implements ParserInterface
{
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => JobTypeIdDto)
  jobTypes: any[];

  @IsOptional()
  @IsString()
  brand: string;

  @IsOptional()
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
  description: string;

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

  @IsUUID()
  @IsOptional()
  educationId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  education: EducationInterface;

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
