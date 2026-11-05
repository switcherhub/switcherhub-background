import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { WorkspaceService } from '../services/workspace.service';
import { OrganizationCreateDto } from '../dto/organization-create.dto';
import { OrganizationUpdateDto } from '../dto/organization-update.dto';
import { WorkspaceInviteDto } from '../dto/workspace-invite.dto';
import { WorkspaceUpdateMemberRoleDto } from '../dto/workspace-update-member-role.dto';
import { WorkspaceAcceptInvitationDto } from '../dto/workspace-accept-invitation.dto';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { AbstractValidationPipe } from 'src/utils/abstract-validation.pipe';
import { WorkspacePermissionGuard } from '../guards/workspace-permission.guard';
import { RequireWorkspacePermission } from '../decorators/workspace-permission.decorator';
import { WorkspacePermissionEnum } from '../types/workspace-permission.enum';
import { WorkspaceModeEnum } from '../types/workspace-mode.enum';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /**
   * Список організацій поточного користувача.
   */
  @Get()
  @UseGuards(JwtUserAuthGuard)
  async getOrganizations(@GetUser() user: UserEntity) {
    return this.workspaceService.getOrganizationsForUser(user.id);
  }

  /**
   * Отримати всіх членів організації та їх ролі.
   */
  @Get(':organizationId/members')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_TEAM)
  async getOrganizationMembers(
    @Param('organizationId') organizationId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.getOrganizationMembers(
      organizationId,
      user.id,
    );
  }

  /**
   * Деталі організації за id. Користувач має бути учасником.
   */
  @Get(':organizationId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_TEAM)
  async getOrganization(
    @Param('organizationId') organizationId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.getOrganizationById(organizationId, user.id);
  }

  /**
   * Створити організацію. Користувач стає owner.
   */
  @Post()
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(OrganizationCreateDto))
  async createOrganization(
    @Body() dto: OrganizationCreateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.createOrganizationWorkspace(user, {
      name: dto.name,
      mode: WorkspaceModeEnum.ORGANIZATION,
    });
  }

  /**
   * Оновити організацію. Потрібен доступ MANAGE_TEAM_USERS (Owner, Admin).
   */
  @Put(':organizationId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  @UsePipes(new AbstractValidationPipe(OrganizationUpdateDto))
  async updateOrganization(
    @Param('organizationId') organizationId: string,
    @Body() dto: OrganizationUpdateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.updateOrganization(
      organizationId,
      user.id,
      dto,
    );
  }

  /**
   * Запросити користувача в організацію.
   */
  @Post(':organizationId/invite')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  @UsePipes(new AbstractValidationPipe(WorkspaceInviteDto))
  async invite(
    @Param('organizationId') organizationId: string,
    @Body() dto: WorkspaceInviteDto,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.getOrganizationById(organizationId, user.id);
    return this.workspaceService.inviteToWorkspace(
      organizationId,
      user.id,
      dto,
    );
  }

  /**
   * Список запрошених до організації з workspace_invitation (pending, ще не прийняли заявку).
   */
  @Get(':organizationId/invitations/pending')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  async getPendingInvitations(
    @Param('organizationId') organizationId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.getPendingInvitationsForWorkspace(
      organizationId,
      user.id,
    );
  }

  /**
   * Відмінити (скасувати) запрошення в організацію.
   */
  @Delete(':organizationId/invitations/:invitationId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  async cancelInvitation(
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.cancelInvitation(
      organizationId,
      invitationId,
      user.id,
    );
  }

  /**
   * Отримати активні запрошення поточного користувача до організацій.
   */
  @Get('invitations/active')
  @UseGuards(JwtUserAuthGuard)
  async getActiveInvitations(@GetUser() user: UserEntity) {
    return this.workspaceService.getActiveInvitationsForUser(user.email);
  }

  /**
   * Прийняти запрошення в організацію за кодом.
   */
  @Post('invitation/accept')
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(WorkspaceAcceptInvitationDto))
  async acceptInvitation(
    @Body() dto: WorkspaceAcceptInvitationDto,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.acceptInvitation(dto.code, user);
  }

  /**
   * Змінити роль учасника в організації.
   */
  @Put(':organizationId/members/:memberId/role')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ASSIGN_ROLES)
  @UsePipes(new AbstractValidationPipe(WorkspaceUpdateMemberRoleDto))
  async updateMemberRole(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: WorkspaceUpdateMemberRoleDto,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.getOrganizationById(organizationId, user.id);
    return this.workspaceService.updateMemberRole(
      organizationId,
      memberId,
      user.id,
      dto,
    );
  }

  /**
   * Передати власність організації іншому учаснику.
   */
  @Post(':organizationId/transfer-ownership')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.TRANSFER_OWNERSHIP)
  async transferOwnership(
    @Param('organizationId') organizationId: string,
    @Body('newOwnerMemberId') newOwnerMemberId: string,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.getOrganizationById(organizationId, user.id);
    return this.workspaceService.transferOwnership(
      organizationId,
      user.id,
      newOwnerMemberId,
    );
  }

  /**
   * Видалити учасника з організації.
   */
  @Delete(':organizationId/members/:memberId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  async removeMember(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.getOrganizationById(organizationId, user.id);
    await this.workspaceService.removeMember(organizationId, memberId, user.id);
    return { success: true };
  }

  /**
   * Покинути організацію.
   */
  @Post(':organizationId/leave')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_TEAM)
  async leaveOrganization(
    @Param('organizationId') organizationId: string,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.getOrganizationById(organizationId, user.id);
    await this.workspaceService.leaveWorkspace(organizationId, user.id);
    return { success: true };
  }
}
