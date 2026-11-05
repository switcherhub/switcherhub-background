export type UserVacancyList =
  | 'favoritesVacancy'
  | 'watchedVacancy'
  | 'blacklistVacancy';

export const USER_VACANCY_LISTS: UserVacancyList[] = [
  'favoritesVacancy',
  'watchedVacancy',
  'blacklistVacancy',
];

export function listVacancyRelations(relation: UserVacancyList) {
  return [
    'jobTypes',
    'industry',
    'user',
    'company',
    'company.logo',
    'perks',
    'benefits',
  ].map((v) => `${relation}.${v}`);
}
