import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { LocationTenureEntity } from '../entities/location-tenure.entity';
import { LocationTenureCreateDto } from '../dto/location-tenure-create.dto';
import { LocationTenureUpdateDto } from '../dto/location-tenure-update.dto';
import { LocationTenureService } from '../services/location-tenure.service';

export const LocationTenureController = ParameterBaseController(
  LocationTenureEntity,
  LocationTenureCreateDto,
  LocationTenureUpdateDto,
  LocationTenureService,
  'location-tenure',
  ['title'],
);

