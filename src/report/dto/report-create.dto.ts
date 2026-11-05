import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { ReportInterface } from '../types/report.interface';
import { ReportTypeInterface } from 'src/report-type/types/report-type.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReportCreateDto
  extends ParameterCreateDto
  implements ReportInterface
{
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
