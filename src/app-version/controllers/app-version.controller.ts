import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { AppVersionEntity } from '../entities/app-version.entity';
import { AppVersionCreateDto } from '../dto/app-version-create.dto';
import { AppVersionUpdateDto } from '../dto/app-version-update.dto';
import { AppVersionService } from '../services/app-version.service';

export const AppVersionController = ParameterBaseController(
  AppVersionEntity,
  AppVersionCreateDto,
  AppVersionUpdateDto,
  AppVersionService,
  'admin/app-version',
);
