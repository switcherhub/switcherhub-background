import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { NotificationTypeEnum } from './notification-type.enum';
import { UserInterface } from 'src/users/interfaces/user.interface';

export interface NotificationInterface extends ParameterBaseInterface {
  title: string;
  type: NotificationTypeEnum;
  isRead: boolean;
  data?: Record<string, unknown> | null;

  user: UserInterface;
  userId: string;
}
