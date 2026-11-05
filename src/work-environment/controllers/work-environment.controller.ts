import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { WorkEnvironmentEntity } from '../entities/work-environment.entity';
import { WorkEnvironmentCreateDto } from '../dto/work-environment-create.dto';
import { WorkEnvironmentUpdateDto } from '../dto/work-environment-update.dto';
import { WorkEnvironmentService } from '../services/work-environment.service';

export const WorkEnvironmentController = ParameterBaseController(
  WorkEnvironmentEntity,
  WorkEnvironmentCreateDto,
  WorkEnvironmentUpdateDto,
  WorkEnvironmentService,
  'work-environment',
  ['title'],
);
