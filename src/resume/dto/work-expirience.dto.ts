import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { WorkExpirienceJsonInterface } from '../types/work-expirience.interface';
import { Type } from 'class-transformer';
import { LocationInterface } from 'src/location/types/location.interface';
import { LocationDto } from 'src/location/dto/location.dto';

export class WorkExpirienceDto implements WorkExpirienceJsonInterface {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsOptional()
  @IsString()
  departament: string | null;

  @IsString()
  @IsNotEmpty()
  position: string;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  workLocation: LocationInterface;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate: Date | null;

  @IsBoolean()
  @IsNotEmpty()
  currentWork: boolean;

  @IsString()
  @IsOptional()
  responsibilities: string | null;

  @IsString()
  @IsNotEmpty()
  industryId: string;

  @IsArray()
  @IsUUID('all', {
    each: true,
  })
  @IsOptional()
  @ArrayMaxSize(100)
  jobTypeIds: string[];
}
