import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import {
  AppVersionInterface,
  AppVersionTypeEnum,
} from '../types/app-version.interface';
import { IsEmpty, IsOptional, IsString } from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class AppVersionUpdateDto
  extends ParameterUpdateDto
  implements AppVersionInterface
{
  @IsOptional()
  @IsString()
  minimumRequiredVersion: string;

  @IsEmpty()
  @IsTrulyEmpty()
  type: AppVersionTypeEnum;
}
