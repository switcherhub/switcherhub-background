import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { MessageInterface } from '../types/message.interface';
import {
  VacancyPayloadInterface,
  ResumePayloadInterface,
  ImagePayloadInterface,
  FilePayloadInterface,
} from '../types/message-payload.interface';
import { MessageTypeEnum } from '../types/message-type.enum';
import { ChatEntity } from 'src/chat/entities/chat.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('message')
export class MessageEntity
  extends ParameterBaseEntity
  implements MessageInterface
{
  @Column({
    type: 'enum',
    enum: MessageTypeEnum,
  })
  type: MessageTypeEnum;

  @Column({
    default: '',
  })
  text: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  payload:
    | VacancyPayloadInterface
    | ResumePayloadInterface
    | ImagePayloadInterface
    | FilePayloadInterface
    | null;

  @ManyToOne(() => ChatEntity, (chat) => chat.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chatId' })
  chat: ChatEntity;

  @Column()
  chatId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @Column()
  userId: string;
}
