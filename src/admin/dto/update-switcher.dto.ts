import { IsOptional, IsString } from 'class-validator';

export class UpdateSwitcherDto {
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @IsString()
  lastName?: string | null;
}
