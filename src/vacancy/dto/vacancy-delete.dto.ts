import { IsNotEmpty, IsString } from 'class-validator';

export class VacancyDeleteDto {
  @IsNotEmpty()
  @IsString()
  noteDeletion: string;
}
