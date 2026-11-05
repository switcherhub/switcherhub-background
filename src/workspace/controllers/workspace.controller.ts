import {
  BadRequestException,
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
import { WorkspaceCreateDto } from '../dto/workspace-create.dto';
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

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /**
   * Get all workspaces for current user.
   */
  @Get()
  @UseGuards(JwtUserAuthGuard)
  async getWorkspaces(@GetUser() user: UserEntity) {
    return this.workspaceService.getWorkspacesForUser(user.id);
  }

  /**
   * Get workspace by id. User must be a member.
   */
  @Get(':workspaceId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_TEAM)
  async getWorkspace(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.getWorkspaceById(workspaceId, user.id);
  }

  /**
   * Create organization workspace. For inviting users, mode must be organization.
   */
  @Post()
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(WorkspaceCreateDto))
  async createWorkspace(
    @Body() dto: WorkspaceCreateDto,
    @GetUser() user: UserEntity,
  ) {
    if (dto.mode === WorkspaceModeEnum.ORGANIZATION) {
      return this.workspaceService.createOrganizationWorkspace(user, dto);
    }
    // Personal workspaces are auto-created on registration
    throw new BadRequestException(
      'Personal workspace is created automatically. Use organization mode to create workspace for team.',
    );
  }

  /**
   * Invite user to organization workspace.
   */
  @Post(':workspaceId/invite')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  @UsePipes(new AbstractValidationPipe(WorkspaceInviteDto))
  async invite(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: WorkspaceInviteDto,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.inviteToWorkspace(workspaceId, user.id, dto);
  }

  /**
   * Список запрошених до workspace з workspace_invitation (pending, ще не прийняли заявку).
   */
  @Get(':workspaceId/invitations/pending')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  async getPendingInvitations(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.getPendingInvitationsForWorkspace(
      workspaceId,
      user.id,
    );
  }

  /**
   * Відмінити (скасувати) запрошення до workspace.
   */
  @Delete(':workspaceId/invitations/:invitationId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  async cancelInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.cancelInvitation(
      workspaceId,
      invitationId,
      user.id,
    );
  }

  /**
   * Отримати активні запрошення поточного користувача.
   */
  @Get('invitations/active')
  @UseGuards(JwtUserAuthGuard)
  async getActiveInvitations(@GetUser() user: UserEntity) {
    return this.workspaceService.getActiveInvitationsForUser(user.email);
  }

  /**
   * Accept invitation by code.
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
   * Update member role.
   */
  @Put(':workspaceId/members/:memberId/role')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ASSIGN_ROLES)
  @UsePipes(new AbstractValidationPipe(WorkspaceUpdateMemberRoleDto))
  async updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: WorkspaceUpdateMemberRoleDto,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.updateMemberRole(
      workspaceId,
      memberId,
      user.id,
      dto,
    );
  }

  /**
   * Transfer ownership to another member.
   */
  @Post(':workspaceId/transfer-ownership')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.TRANSFER_OWNERSHIP)
  async transferOwnership(
    @Param('workspaceId') workspaceId: string,
    @Body('newOwnerMemberId') newOwnerMemberId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.workspaceService.transferOwnership(
      workspaceId,
      user.id,
      newOwnerMemberId,
    );
  }

  /**
   * Remove member from workspace.
   */
  @Delete(':workspaceId/members/:memberId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.MANAGE_TEAM_USERS)
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.removeMember(workspaceId, memberId, user.id);
    return { success: true };
  }

  /**
   * Leave workspace.
   */
  @Post(':workspaceId/leave')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_TEAM)
  async leaveWorkspace(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: UserEntity,
  ) {
    await this.workspaceService.leaveWorkspace(workspaceId, user.id);
    return { success: true };
  }
}
