import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';

export interface SubscriptionInterface extends ParameterBaseInterface {
  title: string;
  isPopular: boolean;

  resumeCount: number;
  vacanciesCount: number;
  companiesCount: number;

  showContctactsDaily: number;
  chatCountDaily: number;
  appliesCountDaily: number;

  upgradeCount: number;

  isFree: boolean;
  type: 'job-seeker' | 'employer' | 'all';

  productId: string | null;
}
