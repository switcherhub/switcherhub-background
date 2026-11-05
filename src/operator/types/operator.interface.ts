import { OperatorRoleEnum } from './operator-role.enum';

export interface OperatorInterface {
  id: string;
  email: string;
  fullName: string;
  role: OperatorRoleEnum;
  deleted: boolean;

  registeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
