import { IsNotEmpty, IsString } from 'class-validator';

export class OrganizationUpdateDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
