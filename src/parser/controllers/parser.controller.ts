import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { ParserEntity } from '../entities/parser.entity';
import { ParserCreateDto } from '../dto/parser-create.dto';
import { ParserUpdateDto } from '../dto/parser-update.dto';
import { ParserService } from '../services/parser.service';

export const ParserController = ParameterBaseController(
  ParserEntity,
  ParserCreateDto,
  ParserUpdateDto,
  ParserService,
  'parser',
);
