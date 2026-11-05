import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import {
  EntityTypeEnum,
  IssueInterface,
  IssueStatusEnum,
} from '../types/issue.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import {
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class IssueCreateDto
  extends ParameterCreateDto
  implements IssueInterface
{
  @IsNotEmpty()
  @IsString()
  entityName: string;

  @IsNotEmpty()
  @IsUUID()
  entityId: string;

  @IsNotEmpty()
  @IsEnum(EntityTypeEnum)
  entityType: EntityTypeEnum;

  @IsOptional()
  note: string | null;

  @IsOptional()
  @IsUUID()
  managerId: string;

  @IsOptional()
  @IsEnum(IssueStatusEnum)
  status: IssueStatusEnum;

  @IsTrulyEmpty()
  manager: UserInterface | undefined;

  @IsTrulyEmpty()
  reports: undefined;
}
