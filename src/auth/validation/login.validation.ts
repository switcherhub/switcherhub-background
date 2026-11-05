import { LoginDto } from '../dto/login.dto';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginValidation implements LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;
}
