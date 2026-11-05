import { VacancyInterface } from '../types/vacancy.interface';

export interface UserVacancyDto extends VacancyInterface {
  status: UserVacancyStatus;
}

export enum UserVacancyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected',
}

export function mapToUserVacancyDto(vacancy: VacancyInterface): UserVacancyDto {
  let status: UserVacancyStatus = UserVacancyStatus.INACTIVE;

  if (!vacancy.isApproved) {
    status = UserVacancyStatus.REJECTED;
  }

  if (vacancy.isHidden && vacancy.isApproved) {
    status = UserVacancyStatus.INACTIVE;
  }

  if (vacancy.isApproved && !vacancy.isHidden) {
    status = UserVacancyStatus.ACTIVE;
  }

  return {
    ...vacancy,
    status,
  };
}
