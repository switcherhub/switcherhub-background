import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { MessageTypeEnum } from './message-type.enum';
import {
  FilePayloadInterface,
  ImagePayloadInterface,
  ResumePayloadInterface,
  VacancyPayloadInterface,
} from './message-payload.interface';

export interface MessageInterface extends ParameterBaseInterface {
  type: MessageTypeEnum;
  text: string;
  chatId: string;
  userId: string;
  payload:
    | VacancyPayloadInterface
    | ResumePayloadInterface
    | ImagePayloadInterface
    | FilePayloadInterface
    | null;
}
