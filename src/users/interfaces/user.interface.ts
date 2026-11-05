import { UserAuthEntity } from 'src/user-auth/user-auth/user-auth.entity';
import { UserRoleEnum } from './user-role.enum';
import { ResumeInterface } from 'src/resume/types/resume.interface';
import { VacancyInterface } from 'src/vacancy/types/vacancy.interface';
import { OperatorInterface } from 'src/operator/types/operator.interface';
import { SubscriptionInterface } from 'src/subscription/types/subscription.interface';

export interface UserInterface {
  id: string;

  firstName: string | null;
  lastName: string | null;

  avatarUrl: string;
  email: string;
  phone: string;
  activeRole: UserRoleEnum;

  codeAuthorization?: string | null;

  // isBlocked: boolean;
  blockExpireAt: Date | null;
  blockReason: string | null;
  blockBy: OperatorInterface | null;

  isVerified: boolean;
  isPasswordSet: boolean;

  createdAt: Date;
  updatedAt: Date;
  googleId: string;
  appleId: string;
  facebookId: string;
  isRegistered: boolean;
  isDeleted: boolean;

  resumeCount: number | null;
  vacanciesCount: number | null;
  companiesCount: number | null;

  showContctactsDaily: number | null;
  chatCountDaily: number | null;
  appliesCountDaily: number | null;

  upgradeCount: number | null;

  resumes: ResumeInterface[];
  vacancies: VacancyInterface[];

  credentials: UserAuthEntity;

  emailNotifications: boolean;
  pushNotifications: boolean;

  subscription: SubscriptionInterface | null;
  subscriptionId: string | null;
}
