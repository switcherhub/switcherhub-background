import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { ResumeEntity } from '../entities/resume.entity';
import { ResumeCreateDto } from '../dto/resume-create.dto';
import { ResumeUpdateDto } from '../dto/resume-update.dto';
import { ResumeService } from '../services/resume.service';

export const ResumeBaseController = ParameterBaseController(
  ResumeEntity,
  ResumeCreateDto,
  ResumeUpdateDto,
  ResumeService,
  'admin/resume',
  [],
);
