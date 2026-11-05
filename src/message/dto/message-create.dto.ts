import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { MessageInterface } from '../types/message.interface';
import {
  VacancyPayloadInterface,
  ResumePayloadInterface,
  ImagePayloadInterface,
  FilePayloadInterface,
} from '../types/message-payload.interface';
import { MessageTypeEnum } from '../types/message-type.enum';
import {
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { IsValidPayload } from '../validation/is-payload.validation';

export class MessageCreateDto
  extends ParameterCreateDto
  implements MessageInterface
{
  @IsNotEmpty()
  @IsEnum(MessageTypeEnum)
  type: MessageTypeEnum;

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

export class MessageSendDto {
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
