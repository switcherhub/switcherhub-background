import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResetValidation {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  recoveryCode: string;

  @IsNotEmpty()
  password: string;
}
