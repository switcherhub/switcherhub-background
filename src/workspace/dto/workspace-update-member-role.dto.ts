import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrganizationRoleEnum } from '../types/organization-role.enum';

export class WorkspaceUpdateMemberRoleDto {
  @IsNotEmpty()
  @IsEnum(OrganizationRoleEnum)
  role: OrganizationRoleEnum;
}
