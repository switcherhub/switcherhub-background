import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { ReportTypeInterface } from 'src/report-type/types/report-type.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';

export interface ReportInterface extends ParameterBaseInterface {
  reportType: ReportTypeInterface;
  reportTypeId: string;

  user: UserInterface;
  userId: string;

  note: string | null;
}
