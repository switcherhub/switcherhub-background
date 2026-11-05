import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { SameRoleCountEntity } from '../entities/same-role-count.entity';
import { SameRoleCountCreateDto } from '../dto/same-role-count-create.dto';
import { SameRoleCountUpdateDto } from '../dto/same-role-count-update.dto';
import { SameRoleCountService } from '../services/same-role-count.service';

export const SameRoleCountController = ParameterBaseController(
  SameRoleCountEntity,
  SameRoleCountCreateDto,
  SameRoleCountUpdateDto,
  SameRoleCountService,
  'same-role-count',
  ['title'],
);

