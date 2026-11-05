import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { NotificationInterface } from '../types/notification.interface';
import { NotificationTypeEnum } from '../types/notification-type.enum';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('notification')
export class NotificationEntity
  extends ParameterBaseEntity
  implements NotificationInterface
{
  @Column({ type: 'enum', enum: NotificationTypeEnum })
  type: NotificationTypeEnum;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown> | null;

  @ManyToOne(() => UserEntity, (user) => user.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ name: 'userId' })
  userId: string;
}
