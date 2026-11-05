import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrganizationRoleEnum } from '../types/organization-role.enum';

export class WorkspaceInviteDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(OrganizationRoleEnum)
  role: OrganizationRoleEnum;
}
