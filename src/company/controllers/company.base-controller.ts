import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { CompanyEntity } from '../entities/company.entity';
import { CompanyCreateDto } from '../dto/company-create.dto';
import { CompanyUpdateDto } from '../dto/company-update.dto';
import { CompanyService } from '../services/company.service';

export const CompanyBaseController = ParameterBaseController(
  CompanyEntity,
  CompanyCreateDto,
  CompanyUpdateDto,
  CompanyService,
  'admin/company',
  ['name'],
);
