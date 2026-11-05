import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionCreateDto } from '../dto/subscription-create.dto';
import { SubscriptionUpdateDto } from '../dto/subscription-update.dto';
import { SubscriptionService } from '../services/subscription.service';

export const SubscriptionAdminController = ParameterBaseController(
  SubscriptionEntity,
  SubscriptionCreateDto,
  SubscriptionUpdateDto,
  SubscriptionService,
  'admin/subscription',
);
