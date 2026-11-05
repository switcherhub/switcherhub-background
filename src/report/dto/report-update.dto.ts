import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { ReportInterface } from '../types/report.interface';
import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { ReportTypeInterface } from 'src/report-type/types/report-type.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';

export class ReportUpdateDto
  extends ParameterUpdateDto
  implements ReportInterface
{
  @IsOptional()
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
}
