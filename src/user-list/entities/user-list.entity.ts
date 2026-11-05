import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { UserListInterface } from '../types/user-list.interface';
import { ListEntityTypeEnum } from '../types/list-entity-type.enum';
import { ListTypeEnum } from '../types/list-type.enum';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('user_list')
export class UserListEntity
  extends ParameterBaseEntity
  implements UserListInterface
{
  @Column({ type: 'enum', enum: ListTypeEnum })
  type: ListTypeEnum;

  @Column({ type: 'enum', enum: ListEntityTypeEnum })
  entityType: ListEntityTypeEnum;

  @Column({ type: 'uuid' })
  entityId: string;

  @ManyToOne(() => UserEntity, (user) => user.userList, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
  })
  user: UserEntity | null;

  @Column({ type: 'uuid' })
  userId: string;
}
