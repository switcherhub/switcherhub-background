import { IsNotEmpty, IsString } from 'class-validator';

export class ResumeDeleteDto {
  @IsNotEmpty()
  @IsString()
  noteDeletion: string;
}
