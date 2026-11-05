import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { TimeToStartWorkingEntity } from '../entities/time-to-start-working.entity';
import { TimeToStartWorkingCreateDto } from '../dto/time-to-start-working-create.dto';
import { TimeToStartWorkingUpdateDto } from '../dto/time-to-start-working-update.dto';
import { TimeToStartWorkingService } from '../services/time-to-start-working.service';

export const TimeToStartWorkingController = ParameterBaseController(
  TimeToStartWorkingEntity,
  TimeToStartWorkingCreateDto,
  TimeToStartWorkingUpdateDto,
  TimeToStartWorkingService,
  'time-to-start-working',
  ['title'],
);

