import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { MessageEntity } from '../entities/message.entity';
import { MessageCreateDto } from '../dto/message-create.dto';
import { MessageUpdateDto } from '../dto/message-update.dto';
import { MessageService } from '../services/message.service';

export const MessageController = ParameterBaseController(
  MessageEntity,
  MessageCreateDto,
  MessageUpdateDto,
  MessageService,
  'message',
);
