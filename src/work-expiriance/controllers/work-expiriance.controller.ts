import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { WorkExpirianceEntity } from '../entities/work-expiriance.entity';
import { WorkExpirianceCreateDto } from '../dto/work-expiriance-create.dto';
import { WorkExpirianceUpdateDto } from '../dto/work-expiriance-update.dto';
import { WorkExpirianceService } from '../services/work-expiriance.service';

export const WorkExpirianceController = ParameterBaseController(
  WorkExpirianceEntity,
  WorkExpirianceCreateDto,
  WorkExpirianceUpdateDto,
  WorkExpirianceService,
  'work-expiriance',
  ['title'],
);
