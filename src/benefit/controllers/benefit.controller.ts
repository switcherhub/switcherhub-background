import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { BenefitEntity } from '../entities/benefit.entity';
import { BenefitCreateDto } from '../dto/benefit-create.dto';
import { BenefitUpdateDto } from '../dto/benefit-update.dto';
import { BenefitService } from '../services/benefit.service';

export const BenefitController = ParameterBaseController(
  BenefitEntity,
  BenefitCreateDto,
  BenefitUpdateDto,
  BenefitService,
  'benefit',
);
