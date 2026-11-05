import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { VacancyEntity } from '../entities/vacancy.entity';
import { VacancyCreateDto } from '../dto/vacancy-create.dto';
import { VacancyUpdateDto } from '../dto/vacancy-update.dto';
import { VacancyService } from '../services/vacancy.service';

export const VacancyBaseController = ParameterBaseController(
  VacancyEntity,
  VacancyCreateDto,
  VacancyUpdateDto,
  VacancyService,
  'admin/vacancy',
  ['title'],
);
