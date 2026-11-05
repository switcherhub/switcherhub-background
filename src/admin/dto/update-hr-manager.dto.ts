import { IsOptional, IsString } from 'class-validator';

export class UpdateHrManagerDto {
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;
}
