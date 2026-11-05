import { IsOptional } from 'class-validator';

export class ParserWebhookDto {
  @IsOptional()
  brands: {
    brand: string;
    new: number;
    inactive: number;
  }[];

  @IsOptional()
  totalNewJobs: number;

  @IsOptional()
  totalInactiveJobs: number;
}
