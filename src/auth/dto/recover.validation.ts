import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoverValidation {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
