export type UserResumeList =
  | 'favoritesResume'
  | 'watchedResume'
  | 'blacklistResume';

export const USER_RESUME_LISTS: UserResumeList[] = [
  'favoritesResume',
  'watchedResume',
  'blacklistResume',
];

export function listRelations(relation: UserResumeList) {
  return ['jobTypes', 'industry', 'education'].map((v) => `${relation}.${v}`);
}
