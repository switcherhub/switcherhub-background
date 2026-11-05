import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { PerkEntity } from '../entities/perk.entity';
import { PerkCreateDto } from '../dto/perk-create.dto';
import { PerkUpdateDto } from '../dto/perk-update.dto';
import { PerkService } from '../services/perk.service';

export const PerkController = ParameterBaseController(
  PerkEntity,
  PerkCreateDto,
  PerkUpdateDto,
  PerkService,
  'perk',
);
