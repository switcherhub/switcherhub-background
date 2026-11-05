import { IsBoolean, IsEmpty, IsOptional, IsString } from 'class-validator';
import { ParameterBaseInterface } from '../types/parameter.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class ParameterUpdateDto implements ParameterBaseInterface {
  @IsString()
  @IsOptional()
  title: string;

  @IsBoolean()
  @IsOptional()
  isHidden: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  id: string;

  @IsEmpty()
  @IsTrulyEmpty()
  order: number;

  @IsEmpty()
  @IsTrulyEmpty()
  createdAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  updatedAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  deletedAt: undefined;
}
