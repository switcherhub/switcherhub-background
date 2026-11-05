import { NotificationTypeEnum } from '../types/notification-type.enum';
import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class NotificationCreateDto {
  @IsNotEmpty()
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
