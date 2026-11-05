import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { ChatEntity } from '../entities/chat.entity';
import { ChatCreateDto } from '../dto/chat-create.dto';
import { ChatUpdateDto } from '../dto/chat-update.dto';
import { ChatService } from '../services/chat.service';

export const ChatAdminController = ParameterBaseController(
  ChatEntity,
  ChatCreateDto,
  ChatUpdateDto,
  ChatService,
  'admin/chat',
);
