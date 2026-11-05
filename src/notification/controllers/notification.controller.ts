import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationCreateDto } from '../dto/notification-create.dto';
import { NotificationUpdateDto } from '../dto/notification-update.dto';
import { NotificationService } from '../services/notification.service';

export const NotificationController = ParameterBaseController(
  NotificationEntity,
  NotificationCreateDto,
  NotificationUpdateDto,
  NotificationService,
  'notification',
);
