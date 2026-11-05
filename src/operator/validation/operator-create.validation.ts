import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  IsEmpty,
  IsEmail,
} from 'class-validator';
import { OperatorRoleEnum } from '../types/operator-role.enum';
import { OperatorInterface } from '../types/operator.interface';
import { CredentialsInterface } from 'src/auth/types/credentials.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class OperatorCreateValidation implements OperatorInterface {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(OperatorRoleEnum)
  @IsNotEmpty()
  role: OperatorRoleEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  credentials: CredentialsInterface;

  @IsEmpty()
  id: undefined;

  @IsEmpty()
  password: undefined;

  @IsEmpty()
  createdAt: undefined;

  @IsEmpty()
  updatedAt: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  deleted: undefined;

  @IsEmpty()
  @IsTrulyEmpty()
  registeredAt: undefined;
}
