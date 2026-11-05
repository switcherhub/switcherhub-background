import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { ReportEntity } from '../entities/report.entity';
import { ReportCreateDto } from '../dto/report-create.dto';
import { ReportUpdateDto } from '../dto/report-update.dto';
import { ReportService } from '../services/report.service';

export const ReportController = ParameterBaseController(
  ReportEntity,
  ReportCreateDto,
  ReportUpdateDto,
  ReportService,
  'report',
);
