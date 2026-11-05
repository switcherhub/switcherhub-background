import {
  IsNotEmpty,
  IsString,
  IsEmail,
} from 'class-validator';
import { IsValidPhoneNumber } from 'src/app/validators/phone';

export class ParticipantConfirmDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsValidPhoneNumber()
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  personalEmail: string;
}

