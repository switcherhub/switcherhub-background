export type UserCompanyList = 'blacklistCompany';

export const USER_COMPANY_LIST: UserCompanyList[] = ['blacklistCompany'];

export function listRelations(relation: UserCompanyList) {
  return ['employeeNumber', 'companyType', 'industry'].map(
    (v) => `${relation}.${v}`,
  );
}
