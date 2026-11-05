import {
  IsBoolean,
  IsEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ParameterBaseInterface } from '../types/parameter.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class ParameterCreateDto implements ParameterBaseInterface {
  @IsString()
  @IsOptional()
  title: string;

  @IsBoolean()
  @IsOptional()
  isHidden: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  id: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  order: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  createdAt: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  updatedAt: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  deletedAt: Date;
}
