import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { CompanyTypeEntity } from '../entities/company-type.entity';
import { CompanyTypeCreateDto } from '../dto/company-type-create.dto';
import { CompanyTypeUpdateDto } from '../dto/company-type-update.dto';
import { CompanyTypeService } from '../services/company-type.service';

export const CompanyTypeController = ParameterBaseController(
  CompanyTypeEntity,
  CompanyTypeCreateDto,
  CompanyTypeUpdateDto,
  CompanyTypeService,
  'company-type',
  ['title'],
);
