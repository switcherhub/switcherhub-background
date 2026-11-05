import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';
import { WorkspaceInvitationEntity } from '../entities/workspace-invitation.entity';
import { WorkspaceInvitationStatusEnum } from '../entities/workspace-invitation.entity';
import { WorkspaceModeEnum } from '../types/workspace-mode.enum';
import { OrganizationRoleEnum } from '../types/organization-role.enum';
import { UserEntity } from 'src/users/entities/user.entity';
import { WorkspaceCreateDto } from '../dto/workspace-create.dto';
import { WorkspaceInviteDto } from '../dto/workspace-invite.dto';
import { WorkspaceUpdateMemberRoleDto } from '../dto/workspace-update-member-role.dto';
import { OrganizationUpdateDto } from '../dto/organization-update.dto';
import { WorkspacePermissionsService } from './workspace-permissions.service';
import { WorkspacePermissionEnum } from '../types/workspace-permission.enum';
import { SwapRequestService } from 'src/swap-request/services/swap-request.service';
import { forwardRef, Inject } from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto';

const PERSONAL_WORKSPACE_NAME = 'Personal Workspace';
const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly workspaceMemberRepository: Repository<WorkspaceMemberEntity>,
    @InjectRepository(WorkspaceInvitationEntity)
    private readonly invitationRepository: Repository<WorkspaceInvitationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly permissionsService: WorkspacePermissionsService,
    @Inject(forwardRef(() => SwapRequestService))
    private readonly swapRequestService: SwapRequestService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create organization workspace. User becomes owner.
   */
  async createOrganizationWorkspace(
    user: UserEntity,
    dto: WorkspaceCreateDto,
  ): Promise<WorkspaceEntity> {
    if (dto.mode !== WorkspaceModeEnum.ORGANIZATION) {
      throw new BadRequestException(
        'To invite users, create workspace with mode organization',
      );
    }

    const workspace = this.workspaceRepository.create({
      name: dto.name,
      mode: WorkspaceModeEnum.ORGANIZATION,
      ownerId: user.id,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    const member = this.workspaceMemberRepository.create({
      workspaceId: savedWorkspace.id,
      userId: user.id,
      role: OrganizationRoleEnum.OWNER,
      joinedAt: new Date(),
    });
    await this.workspaceMemberRepository.save(member);

    // Синхронізуємо всі swap-requests менеджера з новою організацією
    await this.swapRequestService.syncAllManagerSwapRequests(
      user.id,
      savedWorkspace.id,
    );

    return savedWorkspace;
  }

  /**
   * Get all workspaces for user (as member).
   */
  async getWorkspacesForUser(userId: string): Promise<WorkspaceEntity[]> {
    return this.workspaceMemberRepository
      .find({
        where: { userId },
        relations: ['workspace', 'workspace.owner'],
      })
      .then((members) => members.map((m) => m.workspace));
  }

  /**
   * Get only organization workspaces for user.
   */
  async getOrganizationsForUser(userId: string): Promise<WorkspaceEntity[]> {
    const workspaces = await this.getWorkspacesForUser(userId);
    return workspaces.filter((w) => w.mode === WorkspaceModeEnum.ORGANIZATION);
  }

  /**
   * Get organization by id. User must be a member. Throws if not organization mode.
   */
  async getOrganizationById(
    organizationId: string,
    userId: string,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.getWorkspaceById(organizationId, userId);
    if (workspace.mode !== WorkspaceModeEnum.ORGANIZATION) {
      throw new NotFoundException('Organization not found');
    }
    return workspace;
  }

  /**
   * Get workspace by id. User must be a member.
   */
  async getWorkspaceById(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceEntity> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      relations: [
        'workspace',
        'workspace.owner',
        'workspace.members',
        'workspace.members.user',
      ],
    });

    if (!member) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    return member.workspace;
  }

  /**
   * Get user's member record for workspace.
   */
  async getWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      relations: ['workspace'],
    });

    if (!member) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    return member;
  }

  /**
   * Invite user to organization workspace. Requires manage_team_users permission.
   */
  async inviteToWorkspace(
    workspaceId: string,
    inviterId: string,
    dto: WorkspaceInviteDto,
  ): Promise<WorkspaceInvitationEntity> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId: inviterId },
      relations: ['user', 'workspace'],
    });

    if (!member) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    if (!this.permissionsService.canManageTeamUsers(member.role)) {
      throw new ForbiddenException(
        'You do not have permission to invite users',
      );
    }

    const workspace = member.workspace;

    if (workspace.mode !== WorkspaceModeEnum.ORGANIZATION) {
      throw new BadRequestException(
        'Only organization workspaces can have multiple members',
      );
    }

    // Cannot invite as Owner - there can only be one
    if (dto.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException(
        'Cannot invite as Owner. Use transfer ownership instead.',
      );
    }

    // Не запрошувати, якщо людина вже в організації: знайти юзера по email, потім перевірити workspace_member
    const userByEmail = await this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', {
        email: dto.email.trim(),
      })
      .getOne();

    console.log('userByEmail', userByEmail);

    if (userByEmail) {
      const existingMember = await this.workspaceMemberRepository.findOne({
        where: { userId: userByEmail.id },
      });
      if (existingMember) {
        throw new BadRequestException(
          'This person is already a member of organization',
        );
      }
    } else {
      throw new BadRequestException('User with this email is not registered');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = this.invitationRepository.create({
      workspaceId,
      email: dto.email.toLowerCase(),
      role: dto.role,
      code: crypto.randomBytes(32).toString('hex'),
      expiresAt,
      invitedById: inviterId,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Send invitation email
    await this.sendInvitationEmail(
      savedInvitation,
      workspace,
      member.user,
      dto.role,
    );

    return savedInvitation;
  }

  /**
   * Send invitation email to user.
   */
  private async sendInvitationEmail(
    invitation: WorkspaceInvitationEntity,
    workspace: WorkspaceEntity,
    inviter: UserEntity,
    role: OrganizationRoleEnum,
  ): Promise<void> {
    const inviterName =
      inviter.firstName && inviter.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter.email;
    const frontendUrl =
      process.env.FRONTEND_URL || 'https://hr.switcherhub.com';
    const invitationLink = `${frontendUrl}/organization/invitation/accept?code=${invitation.code}`;

    const roleDisplayName =
      {
        [OrganizationRoleEnum.ADMIN]: 'Admin',
        [OrganizationRoleEnum.HR]: 'HR',
        [OrganizationRoleEnum.VIEWER]: 'Viewer',
      }[role] || role;

    const htmlMessage = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Organization Invitation</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f8f8f8; padding: 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 20px;">
        <tr>
          <td>
            <h2 style="color: #333;">You've been invited to join ${workspace.name}</h2>
            <p>Hello,</p>
            <p>${inviterName} has invited you to join <strong>${workspace.name}</strong> organization as <strong>${roleDisplayName}</strong>.</p>
            <p>Click the button below to accept the invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${invitationLink}</p>
            <p><strong>Note:</strong> This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>Thank you,<br>The SwitcherHub Team</p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    try {
      await this.mailService.sendMail(
        invitation.email,
        `Invitation to join ${workspace.name} on SwitcherHub`,
        htmlMessage,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Don't throw error - invitation is already saved, email failure shouldn't break the flow
    }
  }

  /**
   * Accept invitation to join workspace.
   */
  async acceptInvitation(
    code: string,
    user: UserEntity,
  ): Promise<WorkspaceMemberEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: { code, status: WorkspaceInvitationStatusEnum.PENDING },
      relations: ['workspace'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      invitation.status = WorkspaceInvitationStatusEnum.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    const existingMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId: invitation.workspaceId, userId: user.id },
    });

    if (existingMember) {
      throw new BadRequestException(
        'You are already a member of this workspace',
      );
    }

    const member = this.workspaceMemberRepository.create({
      workspaceId: invitation.workspaceId,
      userId: user.id,
      role: invitation.role,
      invitedById: invitation.invitedById,
      joinedAt: new Date(),
    });

    invitation.status = WorkspaceInvitationStatusEnum.ACCEPTED;
    await this.invitationRepository.save(invitation);

    const savedMember = await this.workspaceMemberRepository.save(member);

    // Синхронізуємо всі swap-requests менеджера з новою організацією
    await this.swapRequestService.syncAllManagerSwapRequests(
      user.id,
      invitation.workspaceId,
    );

    return savedMember;
  }

  /**
   * Update member role. Requires assign_roles permission.
   * Cannot change owner role except via transfer ownership.
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    actorId: string,
    dto: WorkspaceUpdateMemberRoleDto,
  ): Promise<WorkspaceMemberEntity> {
    const actorMember = await this.getWorkspaceMember(workspaceId, actorId);

    if (!this.permissionsService.canAssignRoles(actorMember.role)) {
      throw new ForbiddenException(
        'You do not have permission to assign roles',
      );
    }

    const targetMember = await this.workspaceMemberRepository.findOne({
      where: { id: memberId, workspaceId },
      relations: ['user'],
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner's role via this endpoint
    if (targetMember.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException(
        'Use transfer ownership to change owner. Cannot assign different role to owner.',
      );
    }

    // Cannot assign Owner role - use transfer ownership
    if (dto.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException(
        'Use transfer ownership endpoint to assign Owner role',
      );
    }

    targetMember.role = dto.role;
    return this.workspaceMemberRepository.save(targetMember);
  }

  /**
   * Transfer ownership to another member. Only current owner can do this.
   * Current owner becomes Viewer.
   */
  async transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerMemberId: string,
  ): Promise<WorkspaceEntity> {
    const currentOwnerMember = await this.getWorkspaceMember(
      workspaceId,
      currentOwnerId,
    );

    if (
      !this.permissionsService.canTransferOwnership(currentOwnerMember.role)
    ) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }

    const newOwnerMember = await this.workspaceMemberRepository.findOne({
      where: { id: newOwnerMemberId, workspaceId },
    });

    if (!newOwnerMember) {
      throw new NotFoundException('Member not found');
    }

    if (newOwnerMember.userId === currentOwnerId) {
      throw new BadRequestException('Cannot transfer ownership to yourself');
    }

    const workspace = await this.workspaceRepository.findOneOrFail({
      where: { id: workspaceId },
    });

    // Update workspace owner
    workspace.ownerId = newOwnerMember.userId;
    await this.workspaceRepository.save(workspace);

    // New owner gets Owner role
    newOwnerMember.role = OrganizationRoleEnum.OWNER;
    await this.workspaceMemberRepository.save(newOwnerMember);

    // Previous owner becomes Viewer
    currentOwnerMember.role = OrganizationRoleEnum.VIEWER;
    await this.workspaceMemberRepository.save(currentOwnerMember);

    return this.workspaceRepository.findOneOrFail({
      where: { id: workspaceId },
      relations: ['owner', 'members', 'members.user'],
    });
  }

  /**
   * Remove member from workspace (kick). Requires manage_team_users permission.
   * Cannot remove owner - must transfer ownership first.
   */
  async removeMember(
    workspaceId: string,
    memberId: string,
    actorId: string,
  ): Promise<void> {
    const actorMember = await this.getWorkspaceMember(workspaceId, actorId);

    if (!this.permissionsService.canRemoveMember(actorMember.role)) {
      throw new ForbiddenException(
        'You do not have permission to remove members',
      );
    }

    const targetMember = await this.workspaceMemberRepository.findOne({
      where: { id: memberId, workspaceId },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException(
        'Cannot remove owner. Transfer ownership first.',
      );
    }

    await this.workspaceMemberRepository.remove(targetMember);
  }

  /**
   * Leave workspace. Member removes themselves.
   * Owner cannot leave - must transfer ownership first.
   */
  async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    const member = await this.getWorkspaceMember(workspaceId, userId);

    if (member.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException(
        'Owner cannot leave. Transfer ownership to another member first.',
      );
    }

    await this.workspaceMemberRepository.remove(member);
  }

  /**
   * Check if user has permission in workspace.
   */
  async checkPermission(
    workspaceId: string,
    userId: string,
    permission: WorkspacePermissionEnum,
  ): Promise<boolean> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      return false;
    }

    return this.permissionsService.hasPermission(member.role, permission);
  }

  /**
   * Get all members of organization with their roles and user information.
   * User must be a member of the organization.
   */
  async getOrganizationMembers(
    organizationId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity[]> {
    // Verify user is a member and organization exists
    await this.getOrganizationById(organizationId, userId);

    // Get all members with user information
    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId: organizationId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return members;
  }

  /**
   * Update organization. Requires manage_team_users permission (Owner, Admin only).
   */
  async updateOrganization(
    organizationId: string,
    userId: string,
    dto: OrganizationUpdateDto,
  ): Promise<WorkspaceEntity> {
    const member = await this.getWorkspaceMember(organizationId, userId);

    if (!this.permissionsService.canManageTeamUsers(member.role)) {
      throw new ForbiddenException(
        'You do not have permission to update organization',
      );
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: organizationId },
    });

    if (!workspace) {
      throw new NotFoundException('Organization not found');
    }

    if (workspace.mode !== WorkspaceModeEnum.ORGANIZATION) {
      throw new NotFoundException('Organization not found');
    }

    workspace.name = dto.name;
    const updatedWorkspace = await this.workspaceRepository.save(workspace);

    return this.workspaceRepository.findOne({
      where: { id: updatedWorkspace.id },
      relations: ['owner', 'members', 'members.user'],
    });
  }

  /**
   * Список запрошених до організації (workspace_invitation), які ще не прийняли заявку (pending, не прострочені).
   */
  async getPendingInvitationsForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceInvitationEntity[]> {
    await this.getOrganizationById(workspaceId, userId);

    const now = new Date();
    const invitations = await this.invitationRepository.find({
      where: {
        workspaceId,
        status: WorkspaceInvitationStatusEnum.PENDING,
      },
      relations: ['workspace', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invitations.filter((invitation) => {
      if (!invitation.expiresAt) return true;
      return invitation.expiresAt > now;
    });
  }

  /**
   * Відмінити (скасувати) запрошення — видалити запис. Тільки PENDING можна видалити.
   */
  async cancelInvitation(
    workspaceId: string,
    invitationId: string,
    userId: string,
  ): Promise<{ deleted: true }> {
    await this.getOrganizationById(workspaceId, userId);

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== WorkspaceInvitationStatusEnum.PENDING) {
      throw new BadRequestException(
        'Only pending invitations can be cancelled',
      );
    }

    await this.invitationRepository.remove(invitation);
    return { deleted: true };
  }

  /**
   * Get active invitations for user (pending and not expired).
   */
  async getActiveInvitationsForUser(
    userEmail: string,
  ): Promise<WorkspaceInvitationEntity[]> {
    const now = new Date();

    const invitations = await this.invitationRepository.find({
      where: {
        email: userEmail.toLowerCase(),
        status: WorkspaceInvitationStatusEnum.PENDING,
      },
      relations: ['workspace', 'workspace.owner', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });

    // Filter out expired invitations
    return invitations.filter((invitation) => {
      if (!invitation.expiresAt) {
        return true; // No expiration date, consider it active
      }
      return invitation.expiresAt > now;
    });
  }

  async findOneOrFail(workspaceId: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }
}
