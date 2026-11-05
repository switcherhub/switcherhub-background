import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { ReportTypeEntity } from '../entities/report-type.entity';
import { ReportTypeCreateDto } from '../dto/report-type-create.dto';
import { ReportTypeUpdateDto } from '../dto/report-type-update.dto';
import { ReportTypeService } from '../services/report-type.service';

export const ReportTypeController = ParameterBaseController(
  ReportTypeEntity,
  ReportTypeCreateDto,
  ReportTypeUpdateDto,
  ReportTypeService,
  'report-type',
);
