import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserInterface } from '../interfaces/user.interface';
import { IsValidPhoneNumber } from 'src/app/validators/phone';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { SubscriptionInterface } from 'src/subscription/types/subscription.interface';
import { UserRoleEnum } from '../interfaces/user-role.enum';

export class UserCreateValidation implements Partial<UserInterface> {
  @IsNotEmpty()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsValidPhoneNumber()
  phone: string;

  @IsOptional()
  @IsEnum(UserRoleEnum)
  activeRole?: UserRoleEnum;

  @IsNotEmpty()
  @IsTrulyEmpty()
  subscription?: SubscriptionInterface | null;

  @IsNotEmpty()
  @IsTrulyEmpty()
  subscriptionId?: string | null;
}
