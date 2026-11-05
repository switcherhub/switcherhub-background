import { EducationInterface } from 'src/education/types/education.interface';
import { IndustryInterface } from 'src/industry/types/industry.interface';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';

import { LocationInterface } from 'src/location/types/location.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { PerkInterface } from 'src/perk/types/perk.interface';
import { WorkExpirianceInterface } from 'src/work-expiriance/types/work-expiriance.interface';
import { CompanyInterface } from 'src/company/types/company.interface';
import { BenefitInterface } from 'src/benefit/types/benefit.interface';
import { SalaryTypeEnum } from 'src/salary/salary-type.enum';

export interface VacancyInterface extends ParameterBaseInterface {
  id: string;

  title: string;
  industry: IndustryInterface;
  industryId: string;
  jobTypes: JobTypeInterface[];

  salaryType: SalaryTypeEnum;
  minSalaryRange: number | null;
  maxSalaryRange: number | null;

  description: string;
  location: LocationInterface | null;
  perks: PerkInterface[];
  benefits: BenefitInterface[];
  departament: string | null;
  workExpirience: WorkExpirianceInterface | null;
  workExpirienceId: string | null;
  education: EducationInterface;
  educationId: string | null;
  responsibilities: string | null;
  requirements: string | null;
  company: CompanyInterface;
  companyId: string;
  applicationLink: string | null;
  allowChat: boolean;
  salaryPeriod: SalaryPeriodEnum;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;

  user: UserInterface | null;

  isHidden: boolean;
  isApproved: boolean;
  expirationDate: Date;

  deletedAt: Date | null;
  noteDeletion: string | null;

  showedContacts: number;
  views: number;
  chatsStarted: number;
  reviews: number;

  parserId: string | null;
  isPremium: boolean;
}

export type ResumeKey = keyof VacancyInterface;
