import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { NotificationInterface } from '../types/notification.interface';
import { IsEmpty, IsEnum, IsOptional } from 'class-validator';
import { NotificationTypeEnum } from '../types/notification-type.enum';
import { UserInterface } from 'src/users/interfaces/user.interface';

export class NotificationUpdateDto
  extends ParameterUpdateDto
  implements NotificationInterface
{
  @IsOptional()
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @IsOptional()
  isRead: boolean | undefined;

  @IsEmpty()
  user: UserInterface | undefined;

  @IsEmpty()
  userId: string;
}
