import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeCreateDto } from '../dto/job-type-create.dto';
import { JobTypeUpdateDto } from '../dto/job-type-update.dto';
import { JobTypeService } from '../services/job-type.service';

export const JobTypeController = ParameterBaseController(
  JobTypeEntity,
  JobTypeCreateDto,
  JobTypeUpdateDto,
  JobTypeService,
  'job-types',
  ['title'],
);
