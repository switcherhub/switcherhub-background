import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { UserListInterface } from '../types/user-list.interface';
import { IsEnum, IsUUID, IsOptional, IsEmpty } from 'class-validator';
import { ListEntityTypeEnum } from '../types/list-entity-type.enum';
import { ListTypeEnum } from '../types/list-type.enum';

export class UserListUpdateDto
  extends ParameterUpdateDto
  implements UserListInterface
{
  @IsOptional()
  @IsEnum(ListTypeEnum)
  type: ListTypeEnum;

  @IsOptional()
  @IsEnum(ListEntityTypeEnum)
  entityType: ListEntityTypeEnum;

  @IsOptional()
  @IsUUID()
  entityId: string;

  @IsEmpty()
  userId: string;

  @IsEmpty()
  companyName: string;

  @IsEmpty()
  address: string;

  @IsEmpty()
  minSalaryRange: number;

  @IsEmpty()
  maxSalaryRange: number;

  @IsEmpty()
  jobTypesIds: string[];

  @IsEmpty()
  industryId: string;

  @IsEmpty()
  entityCreatedAt: Date;

  @IsEmpty()
  contactPerson: string;

  @IsEmpty()
  contactEmail: string;

  @IsEmpty()
  contactPhone: string;
}
