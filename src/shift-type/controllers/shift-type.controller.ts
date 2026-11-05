import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { ShiftTypeEntity } from '../entities/shift-type.entity';
import { ShiftTypeCreateDto } from '../dto/shift-type-create.dto';
import { ShiftTypeUpdateDto } from '../dto/shift-type-update.dto';
import { ShiftTypeService } from '../services/shift-type.service';

export const ShiftTypeController = ParameterBaseController(
  ShiftTypeEntity,
  ShiftTypeCreateDto,
  ShiftTypeUpdateDto,
  ShiftTypeService,
  'shift-type',
  ['title'],
);
