import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { ReportInterface } from 'src/report/types/report.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';

export interface IssueInterface extends ParameterBaseInterface {
  entityId: string;
  entityType: EntityTypeEnum;
  entityName: string;

  note: string | null;
  manager: UserInterface | null;
  managerId: string | null;
  status: IssueStatusEnum;

  reports: ReportInterface[];
}

export enum EntityTypeEnum {
  RESUME = 'resume',
  USER = 'user',
  VACANCY = 'vacancy',
  COMPANY = 'company',
}

export enum IssueStatusEnum {
  NEW = 'new',
  CLOSED = 'closed',
  BLOCKED = 'blocked',
}
