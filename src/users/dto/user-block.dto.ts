import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UserBlockDto {
  @IsOptional()
  @IsInt()
  days: number;

  @IsOptional()
  @IsString()
  blockReason: string;

  @IsOptional()
  @IsBoolean()
  isPermanent: boolean;
}
