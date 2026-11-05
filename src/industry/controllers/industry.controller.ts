import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { IndustryEntity } from '../entities/industry.entity';
import { IndustryCreateDto } from '../dto/industry-create.dto';
import { IndustryUpdateDto } from '../dto/industry-update.dto';
import { IndustryService } from '../services/industry.service';

export const IndustryController = ParameterBaseController(
  IndustryEntity,
  IndustryCreateDto,
  IndustryUpdateDto,
  IndustryService,
  'industry',
  ['title'],
);
