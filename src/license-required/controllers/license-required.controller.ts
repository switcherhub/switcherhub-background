import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { LicenseRequiredEntity } from '../entities/license-required.entity';
import { LicenseRequiredCreateDto } from '../dto/license-required-create.dto';
import { LicenseRequiredUpdateDto } from '../dto/license-required-update.dto';
import { LicenseRequiredService } from '../services/license-required.service';

export const LicenseRequiredController = ParameterBaseController(
  LicenseRequiredEntity,
  LicenseRequiredCreateDto,
  LicenseRequiredUpdateDto,
  LicenseRequiredService,
  'license-required',
  ['title'],
);

