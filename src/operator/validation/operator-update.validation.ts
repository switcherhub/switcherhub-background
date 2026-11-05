import { CredentialsInterface } from 'src/auth/types/credentials.interface';
import { OperatorRoleEnum } from '../types/operator-role.enum';
import { OperatorInterface } from '../types/operator.interface';
import { IsEmpty, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { NotRequired } from 'src/app/validators/not-required';

export class OperatorUpdateValidation implements OperatorInterface {
  @IsString()
  @NotRequired()
  fullName: string;

  @IsEnum(OperatorRoleEnum)
  @NotRequired()
  role: OperatorRoleEnum;

  @IsEmpty()
  @IsTrulyEmpty()
  email: string;

  @IsEmpty()
  @IsTrulyEmpty()
  credentials: CredentialsInterface;

  @IsEmpty()
  @IsTrulyEmpty()
  deleted: boolean;

  @IsEmpty()
  @IsTrulyEmpty()
  createdAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  updatedAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  registeredAt: Date;

  @IsEmpty()
  @IsTrulyEmpty()
  id: string;
}
