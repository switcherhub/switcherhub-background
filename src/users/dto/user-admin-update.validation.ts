import {
  IsBoolean,
  IsDate,
  IsEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UserInterface } from '../interfaces/user.interface';
import { UserRoleEnum } from '../interfaces/user-role.enum';
import { UserAuthEntity } from 'src/user-auth/user-auth/user-auth.entity';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { ResumeInterface } from 'src/resume/types/resume.interface';
import { IsValidPhoneNumber } from 'src/app/validators/phone';
import { VacancyInterface } from 'src/vacancy/types/vacancy.interface';
import { Type } from 'class-transformer';
import { OperatorInterface } from 'src/operator/types/operator.interface';
import { SubscriptionInterface } from 'src/subscription/types/subscription.interface';

export class UserAdminUpdateValidation implements UserInterface {
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
  @IsDate()
  @Type(() => Date)
  blockExpireAt: Date | null;

  @IsOptional()
  @IsValidPhoneNumber()
  phone: string;

  @IsOptional()
  @IsEnum(UserRoleEnum)
  activeRole: UserRoleEnum;

  @IsOptional()
  @IsBoolean()
  isBlocked: boolean;

  @IsOptional()
  @IsBoolean()
  isRegistered: boolean;

  @IsOptional()
  @IsBoolean()
  isDeleted: boolean;

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
  resumes: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  favoritesResume: ResumeInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  watchedResume: ResumeInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  blacklistResume: ResumeInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  favoritesVacancy: VacancyInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  watchedVacancy: VacancyInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  blacklistVacancy: VacancyInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  vacancies: VacancyInterface[];

  @IsEmpty()
  @IsTrulyEmpty()
  blockReason: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  blockBy: OperatorInterface | null;

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
  upgradeCount: number | null;

  @IsOptional()
  @IsUUID()
  subscriptionId: string | null;

  @IsEmpty()
  @IsTrulyEmpty()
  subscription: SubscriptionInterface | null;

  @IsOptional()
  @IsBoolean()
  emailNotifications: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications: boolean;
}
