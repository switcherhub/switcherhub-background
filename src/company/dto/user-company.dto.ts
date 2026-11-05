import { CompanyInterface } from '../types/company.interface';

export interface UserCompanyDto extends CompanyInterface {
  status: UserCompanyStatus;
}

export enum UserCompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected',
}

export function mapToUserCompanyDto(company: CompanyInterface): UserCompanyDto {
  let status: UserCompanyStatus = UserCompanyStatus.INACTIVE;

  if (!company.isApproved) {
    status = UserCompanyStatus.REJECTED;
  }

  if (company.isHidden && company.isApproved) {
    status = UserCompanyStatus.INACTIVE;
  }

  if (company.isApproved && !company.isHidden) {
    status = UserCompanyStatus.ACTIVE;
  }

  return {
    ...company,
    status,
  };
}
