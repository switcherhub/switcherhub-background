import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrganizationRoleEnum } from 'src/workspace/types/organization-role.enum';

export class UpdateHrManagerRoleDto {
  @IsNotEmpty()
  @IsEnum(OrganizationRoleEnum)
  role: OrganizationRoleEnum.ADMIN | OrganizationRoleEnum.HR | OrganizationRoleEnum.VIEWER;
}
