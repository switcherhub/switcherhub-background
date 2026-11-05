import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { SubscriptionInterface } from '../types/subscription.interface';
import {
  IsBoolean,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class SubscriptionCreateDto
  extends ParameterCreateDto
  implements SubscriptionInterface
{
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsBoolean()
  isPopular: boolean;

  @IsNotEmpty()
  @IsNumber()
  resumeCount: number;

  @IsNotEmpty()
  @IsNumber()
  vacanciesCount: number;

  @IsNotEmpty()
  @IsNumber()
  companiesCount: number;

  @IsNotEmpty()
  @IsNumber()
  showContctactsDaily: number;

  @IsNotEmpty()
  @IsNumber()
  chatCountDaily: number;

  @IsNotEmpty()
  @IsNumber()
  appliesCountDaily: number;

  @IsNotEmpty()
  @IsNumber()
  upgradeCount: number;

  @IsEmpty()
  @IsTrulyEmpty()
  isFree: boolean;

  @IsOptional()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsEnum(['job-seeker', 'employer', 'all'])
  type: 'job-seeker' | 'employer' | 'all';
}
