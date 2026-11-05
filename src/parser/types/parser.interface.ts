import { BenefitInterface } from 'src/benefit/types/benefit.interface';
import { CompanyInterface } from 'src/company/types/company.interface';
import { EducationInterface } from 'src/education/types/education.interface';
import { JobTypeInterface } from 'src/job-type/types/job-type.interface';
import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { PerkInterface } from 'src/perk/types/perk.interface';

export interface ParserInterface extends ParameterBaseInterface {
  brand: string;
  company: CompanyInterface;
  companyId: string;
  active: boolean;

  jobTypes: JobTypeInterface[];
  perks: PerkInterface[];
  benefits: BenefitInterface[];
  education: EducationInterface;
  educationId: string | null;
  description: string | null;

  isProcessing: boolean;

  lastProcessedAt: Date | null;
  lastAddedCount: number;
  lastUpdatedCount: number;
  lastDeletedCount: number;

  totalParsedCount: number;

  startProcessingAt: Date | null;
}
