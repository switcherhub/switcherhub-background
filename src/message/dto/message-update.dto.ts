import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { MessageInterface } from '../types/message.interface';
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsEmpty,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import {
  VacancyPayloadInterface,
  ResumePayloadInterface,
  ImagePayloadInterface,
  FilePayloadInterface,
} from '../types/message-payload.interface';
import { MessageTypeEnum } from '../types/message-type.enum';
import { IsValidPayload } from '../validation/is-payload.validation';

export class MessageUpdateDto
  extends ParameterUpdateDto
  implements MessageInterface
{
  @IsNotEmpty()
  @IsEnum(MessageTypeEnum)
  type: MessageTypeEnum;

  @IsOptional()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsUUID()
  chatId: string;

  @IsOptional()
  @IsValidPayload()
  payload:
    | VacancyPayloadInterface
    | ResumePayloadInterface
    | ImagePayloadInterface
    | FilePayloadInterface
    | null;

  @IsEmpty()
  @IsTrulyEmpty()
  userId: string;
}
