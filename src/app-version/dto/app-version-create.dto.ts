import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import {
  AppVersionInterface,
  AppVersionTypeEnum,
} from '../types/app-version.interface';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class AppVersionCreateDto
  extends ParameterCreateDto
  implements AppVersionInterface
{
  @IsNotEmpty()
  @IsString()
  minimumRequiredVersion: string;

  @IsNotEmpty()
  @IsEnum(AppVersionTypeEnum)
  type: AppVersionTypeEnum;
}
