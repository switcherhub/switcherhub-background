import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { UserListInterface } from '../types/user-list.interface';
import { ListEntityTypeEnum } from '../types/list-entity-type.enum';
import { ListTypeEnum } from '../types/list-type.enum';
import { IsEmpty, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class UserListCreateDto
  extends ParameterCreateDto
  implements UserListInterface
{
  @IsNotEmpty()
  @IsEnum(ListTypeEnum)
  type: ListTypeEnum;

  @IsNotEmpty()
  @IsEnum(ListEntityTypeEnum)
  entityType: ListEntityTypeEnum;

  @IsNotEmpty()
  @IsUUID()
  entityId: string;

  @IsEmpty()
  userId: string;
}
