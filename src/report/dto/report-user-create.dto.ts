import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { ReportInterface } from '../types/report.interface';
import { ReportTypeInterface } from 'src/report-type/types/report-type.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EntityTypeEnum } from 'src/issue/types/issue.interface';

export class ReportUserCreateDto
  extends ParameterCreateDto
  implements ReportInterface
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

  @IsNotEmpty()
  @IsUUID()
  reportTypeId: string;

  @IsOptional()
  @IsString()
  note: string | null;

  @IsTrulyEmpty()
  reportType: ReportTypeInterface;

  @IsTrulyEmpty()
  userId: string;

  @IsTrulyEmpty()
  user: UserInterface;

  @IsTrulyEmpty()
  title: string;

  @IsTrulyEmpty()
  isHidden: boolean;
}
