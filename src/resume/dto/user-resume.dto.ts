import { ResumeInterface } from '../types/resume.interface';

export interface UserResumeDto extends ResumeInterface {
  status: UserResumeStatus;
}

export enum UserResumeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected',
}

export function mapToUserResumeDto(resume: ResumeInterface): UserResumeDto {
  if (resume.isActive === false) {
    return {
      ...resume,
      status: UserResumeStatus.INACTIVE,
    };
  }

  let status: UserResumeStatus = UserResumeStatus.INACTIVE;

  if (!resume.isApproved) {
    status = UserResumeStatus.REJECTED;
  }

  if (resume.isHidden && resume.isApproved) {
    status = UserResumeStatus.INACTIVE;
  }

  if (resume.isApproved && !resume.isHidden) {
    status = UserResumeStatus.ACTIVE;
  }

  return {
    ...resume,
    status,
  };
}
