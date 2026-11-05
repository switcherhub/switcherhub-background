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
import { IsValidPhoneNumber } from 'src/app/validators/phone';

export class OperatorCreateByAdminValidation implements OperatorInterface {
  @IsEmpty()
  id: undefined;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(OperatorRoleEnum)
  @IsNotEmpty()
  role: OperatorRoleEnum;

  @IsValidPhoneNumber()
  @IsOptional()
  phone: string;

  @IsEmpty()
  @IsTrulyEmpty()
  credentials: CredentialsInterface;

  @IsEmpty()
  @IsTrulyEmpty()
  deleted: boolean;

  @IsEmpty()
  createdAt: Date;

  @IsEmpty()
  updatedAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  registeredAt: Date;
}
