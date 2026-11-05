import { IsNotEmpty, IsString } from 'class-validator';

export class OrganizationCreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
