import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Swap-terms (minimums/availability) for POST/PATCH /resume/:id/swap-terms (spec §5 S05). */
export class ResumeSwapTermsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minHours?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availabilityShifts?: string[];

  @IsOptional()
  @IsBoolean()
  allowJobTypeChange?: boolean;
}
