import {
  IsBoolean,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { UserInterface } from '../interfaces/user.interface';
import { UserRoleEnum } from '../interfaces/user-role.enum';
import { UserAuthEntity } from 'src/user-auth/user-auth/user-auth.entity';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { ResumeInterface } from 'src/resume/types/resume.interface';
import { IsValidPhoneNumber } from 'src/app/validators/phone';
import { VacancyInterface } from 'src/vacancy/types/vacancy.interface';
import { OperatorInterface } from 'src/operator/types/operator.interface';
import { SubscriptionInterface } from 'src/subscription/types/subscription.interface';

export class UserUpdateValidation implements UserInterface {
  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  avatarUrl: string;

  @IsOptional()
  @IsBoolean()
  isRegistered: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  isDeleted: boolean;

  @IsOptional()
  @IsValidPhoneNumber()
  phone: string;

  @IsOptional()
  @IsEnum(UserRoleEnum)
  activeRole: UserRoleEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  blockExpireAt: Date | null;

  @IsEmpty()
  @IsTrulyEmpty()
  codeAuthorization?: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  createdAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  updatedAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  googleId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  appleId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  facebookId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  credentials: UserAuthEntity;

  @IsEmpty()
  @IsTrulyEmpty()
  email: string;

  @IsEmpty()
  @IsTrulyEmpty()
  id: string;

  @IsEmpty()
  @IsTrulyEmpty()
  isVerified: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  isPasswordSet: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  resumes: ResumeInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  vacancies: VacancyInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  blockReason: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  blockBy: OperatorInterface | null;

  @IsEmpty()
  @IsTrulyEmpty()
  resumeCount: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  vacanciesCount: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  companiesCount: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  showContctactsDaily: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  chatCountDaily: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  appliesCountDaily: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  upgradeCount: number | null;

  @IsEmpty()
  @IsTrulyEmpty()
  subscription: SubscriptionInterface | null;

  @IsEmpty()
  @IsTrulyEmpty()
  subscriptionId: string | null;

  @IsOptional()
  @IsBoolean()
  emailNotifications: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications: boolean;
}
