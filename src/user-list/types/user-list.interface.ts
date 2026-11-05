import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { ListTypeEnum } from './list-type.enum';
import { ListEntityTypeEnum } from './list-entity-type.enum';

export interface UserListInterface extends ParameterBaseInterface {
  type: ListTypeEnum;
  entityType: ListEntityTypeEnum;
  entityId: string;

  userId: string;
}
