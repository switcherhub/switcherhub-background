import { IsNotEmpty, IsString } from 'class-validator';

export class HrJoinDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}
