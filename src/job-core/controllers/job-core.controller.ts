import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { JobCoreEntity } from '../entities/job-core.entity';
import { JobCoreCreateDto } from '../dto/job-core-create.dto';
import { JobCoreUpdateDto } from '../dto/job-core-update.dto';
import { JobCoreService } from '../services/job-core.service';

export const JobCoreController = ParameterBaseController(
  JobCoreEntity,
  JobCoreCreateDto,
  JobCoreUpdateDto,
  JobCoreService,
  'job-core',
  ['title'],
);
