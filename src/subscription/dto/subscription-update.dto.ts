import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { SubscriptionInterface } from '../types/subscription.interface';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsEmpty,
  IsEnum,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class SubscriptionUpdateDto
  extends ParameterUpdateDto
  implements SubscriptionInterface
{
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(['job-seeker', 'employer', 'all'])
  type: 'job-seeker' | 'employer' | 'all';

  @IsOptional()
  @IsBoolean()
  isPopular: boolean;

  @IsOptional()
  @IsNumber()
  resumeCount: number;

  @IsOptional()
  @IsNumber()
  vacanciesCount: number;

  @IsOptional()
  @IsNumber()
  companiesCount: number;

  @IsOptional()
  @IsNumber()
  showContctactsDaily: number;

  @IsOptional()
  @IsNumber()
  chatCountDaily: number;

  @IsOptional()
  @IsNumber()
  appliesCountDaily: number;

  @IsOptional()
  @IsNumber()
  upgradeCount: number;

  @IsOptional()
  @IsString()
  productId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  isFree: boolean;
}
