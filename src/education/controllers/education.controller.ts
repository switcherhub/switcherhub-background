import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { EducationEntity } from '../entities/education.entity';
import { EducationCreateDto } from '../dto/education-create.dto';
import { EducationUpdateDto } from '../dto/education-update.dto';
import { EducationService } from '../services/education.service';

export const EducationController = ParameterBaseController(
  EducationEntity,
  EducationCreateDto,
  EducationUpdateDto,
  EducationService,
  'education',
  ['title'],
);
