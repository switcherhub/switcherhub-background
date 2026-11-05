import { IsNotEmpty, IsString } from 'class-validator';

export class CompanyDeleteDto {
  @IsNotEmpty()
  @IsString()
  noteDeletion: string;
}
