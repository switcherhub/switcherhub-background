import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import {
  EntityTypeEnum,
  IssueInterface,
  IssueStatusEnum,
} from '../types/issue.interface';
import { IsEmpty, IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class IssueUpdateDto
  extends ParameterUpdateDto
  implements IssueInterface
{
  @IsOptional()
  @IsString()
  entityName: string;

  @IsOptional()
  note: string | null;

  @IsOptional()
  @IsUUID()
  managerId: string;

  @IsOptional()
  @IsEnum(IssueStatusEnum)
  status: IssueStatusEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  manager: UserInterface | null;

  @IsEmpty()
  @IsTrulyEmpty()
  entityId: string;

  @IsEmpty()
  @IsTrulyEmpty()
  entityType: EntityTypeEnum;

  @IsTrulyEmpty()
  reports: undefined;
}
