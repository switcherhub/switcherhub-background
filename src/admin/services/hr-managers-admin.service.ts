import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { SwapStatusEnum } from 'src/swap-request/types/swap-status.enum';
import { CancelledByTypeEnum } from 'src/swap-request/types/cancelled-by-type.enum';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { WorkspaceMemberEntity } from 'src/workspace/entities/workspace-member.entity';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
import { OrganizationRoleEnum } from 'src/workspace/types/organization-role.enum';
import { WorkspaceModeEnum } from 'src/workspace/types/workspace-mode.enum';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { HrManagerListItemDto } from '../dto/hr-manager-list-item.dto';
import { HrManagersSummaryDto } from '../dto/hr-managers-summary.dto';
import { UpdateHrManagerRoleDto } from '../dto/update-hr-manager-role.dto';
import { UpdateHrManagerDto } from '../dto/update-hr-manager.dto';

const PENDING_STATUSES = [
  SwapStatusEnum.CREATED,
  SwapStatusEnum.PARTICIPANTS_CONFIRMED,
  SwapStatusEnum.HR_INVITED,
  SwapStatusEnum.PAYMENT_PENDING,
];

const INACTIVE_AFTER_DAYS = 30;

const ROLE_PRIORITY: Record<OrganizationRoleEnum, number> = {
  [OrganizationRoleEnum.OWNER]: 0,
  [OrganizationRoleEnum.ADMIN]: 1,
  [OrganizationRoleEnum.HR]: 2,
  [OrganizationRoleEnum.VIEWER]: 3,
};

type MemberSwapStats = {
  approved: number;
  rejected: number;
  pending: number;
  successfulSwaps: number;
  lastActivityAt: Date | null;
};

type MemberKey = string;

type HrManagerContext = {
  member: WorkspaceMemberEntity | null;
  workspaceRole: OrganizationRoleEnum | null;
  organization: { id: string; name: string } | null;
};

const EMPTY_STATS: MemberSwapStats = {
  approved: 0,
  rejected: 0,
  pending: 0,
  successfulSwaps: 0,
  lastActivityAt: null,
};

@Injectable()
export class HrManagersAdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly workspaceMemberRepository: Repository<WorkspaceMemberEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(SwapRequestEntity)
    private readonly swapRequestRepository: Repository<SwapRequestEntity>,
    private readonly configService: ConfigService,
  ) {}

  async getSummary(): Promise<HrManagersSummaryDto> {
    const [total, approvedPaid, pending, notApproved, stuckViewers] =
      await Promise.all([
        this.countEmployers(),
        this.swapRequestRepository.count({
          where: { status: SwapStatusEnum.COMPLETED },
        }),
        this.swapRequestRepository.count({
          where: { status: In(PENDING_STATUSES) },
        }),
        this.swapRequestRepository.count({
          where: {
            status: SwapStatusEnum.CANCELLED,
            cancelledByType: In([
              CancelledByTypeEnum.HR_A,
              CancelledByTypeEnum.HR_B,
            ]),
          },
        }),
        this.countStuckViewers(),
      ]);

    const decidedTotal = approvedPaid + notApproved;
    const rejectionRate =
      decidedTotal > 0
        ? `${Math.round((notApproved / decidedTotal) * 1000) / 10}%`
        : '0%';

    return {
      total,
      approvedPaid,
      approvedPaidChange: null,
      pending,
      pendingNote:
        stuckViewers > 0
          ? `${stuckViewers} Viewer${stuckViewers > 1 ? 's' : ''} stuck`
          : null,
      notApproved,
      rejectionRate,
    };
  }

  async findAll(
    page?: string | number,
    perPage?: string | number,
    search?: string,
    role?: string,
  ): Promise<FilterResponseInterface<HrManagerListItemDto>> {
    const safePage = Math.max(1, Number(page) || 1);
    const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 20));
    const offset = (safePage - 1) * safePerPage;

    const qb = this.userRepository
      .createQueryBuilder('employer')
      .where('employer.activeRole = :employerRole', {
        employerRole: UserRoleEnum.EMPLOYER,
      })
      .andWhere('employer.isDeleted = false');

    this.applySearchFilter(qb, search);
    this.applyRoleFilter(qb, role);

    const [users, total] = await qb
      .orderBy('employer.createdAt', 'ASC')
      .skip(offset)
      .take(safePerPage)
      .getManyAndCount();

    const userIds = users.map((user) => user.id);
    const [codeMap, membershipsMap, ownedWorkspacesMap, statsMap] = await Promise.all([
      this.buildCodeMap(),
      this.loadOrganizationMemberships(userIds),
      this.loadOwnedOrganizationWorkspaces(userIds),
      this.buildSwapStatsMap(),
    ]);
    const paymentAmountCents = this.getPaymentAmountCents();

    const data = users.map((user) => {
      const memberships = membershipsMap.get(user.id) ?? [];
      const ownedWorkspaces = ownedWorkspacesMap.get(user.id) ?? [];
      const context = this.resolveHrContext(user.id, memberships, ownedWorkspaces);
      const stats = this.aggregateUserStats(user.id, memberships, statsMap);

      return this.toListItem(
        user,
        context,
        codeMap.get(user.id) ?? 1,
        stats,
        paymentAmountCents,
      );
    });

    return {
      data,
      total,
      page: safePage,
      perPage: safePerPage,
      pageCount: Math.ceil(total / safePerPage) || 1,
    };
  }

  async updateRole(
    memberId: string,
    dto: UpdateHrManagerRoleDto,
  ): Promise<HrManagerListItemDto> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { id: memberId },
      relations: ['workspace', 'user'],
    });

    if (
      !member ||
      member.workspace.mode !== WorkspaceModeEnum.ORGANIZATION ||
      member.user.activeRole !== UserRoleEnum.EMPLOYER ||
      member.user.isDeleted
    ) {
      throw new NotFoundException('HR manager not found');
    }

    if (member.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException(
        'Cannot change owner role. Use transfer ownership instead.',
      );
    }

    member.role = dto.role;
    await this.workspaceMemberRepository.save(member);

    const codeMap = await this.buildCodeMap();
    const membershipsMap = await this.loadOrganizationMemberships([member.userId]);
    const ownedWorkspacesMap = await this.loadOwnedOrganizationWorkspaces([
      member.userId,
    ]);
    const memberships = membershipsMap.get(member.userId) ?? [];
    const ownedWorkspaces = ownedWorkspacesMap.get(member.userId) ?? [];
    const context = this.resolveHrContext(member.userId, memberships, ownedWorkspaces);
    const statsMap = await this.buildSwapStatsMap();
    const stats = this.aggregateUserStats(member.userId, memberships, statsMap);

    return this.toListItem(
      member.user,
      context,
      codeMap.get(member.userId) ?? 1,
      stats,
      this.getPaymentAmountCents(),
    );
  }

  async removeMember(memberId: string): Promise<void> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { id: memberId },
      relations: ['workspace', 'user'],
    });

    if (
      !member ||
      member.workspace.mode !== WorkspaceModeEnum.ORGANIZATION ||
      member.user.activeRole !== UserRoleEnum.EMPLOYER ||
      member.user.isDeleted
    ) {
      throw new NotFoundException('HR manager not found');
    }

    if (member.role === OrganizationRoleEnum.OWNER) {
      throw new BadRequestException('Cannot remove organization owner');
    }

    await this.workspaceMemberRepository.remove(member);
  }

  async update(
    userId: string,
    dto: UpdateHrManagerDto,
  ): Promise<HrManagerListItemDto> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        activeRole: UserRoleEnum.EMPLOYER,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('HR manager not found');
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName?.trim() || null;
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName?.trim() || null;
    }

    await this.userRepository.save(user);

    const codeMap = await this.buildCodeMap();
    const membershipsMap = await this.loadOrganizationMemberships([userId]);
    const ownedWorkspacesMap = await this.loadOwnedOrganizationWorkspaces([
      userId,
    ]);
    const memberships = membershipsMap.get(userId) ?? [];
    const ownedWorkspaces = ownedWorkspacesMap.get(userId) ?? [];
    const context = this.resolveHrContext(userId, memberships, ownedWorkspaces);
    const statsMap = await this.buildSwapStatsMap();
    const stats = this.aggregateUserStats(userId, memberships, statsMap);

    return this.toListItem(
      user,
      context,
      codeMap.get(userId) ?? 1,
      stats,
      this.getPaymentAmountCents(),
    );
  }

  private async countEmployers(): Promise<number> {
    return this.userRepository.count({
      where: {
        activeRole: UserRoleEnum.EMPLOYER,
        isDeleted: false,
      },
    });
  }

  private async countStuckViewers(): Promise<number> {
    const viewers = await this.workspaceMemberRepository
      .createQueryBuilder('wm')
      .innerJoinAndSelect('wm.workspace', 'workspace')
      .innerJoinAndSelect('wm.user', 'user')
      .where('workspace.mode = :mode', { mode: WorkspaceModeEnum.ORGANIZATION })
      .andWhere('wm.role = :role', { role: OrganizationRoleEnum.VIEWER })
      .andWhere('wm.joinedAt IS NOT NULL')
      .andWhere('user.activeRole = :employerRole', {
        employerRole: UserRoleEnum.EMPLOYER,
      })
      .andWhere('user.isDeleted = false')
      .getMany();

    if (viewers.length === 0) {
      return 0;
    }

    const statsMap = await this.buildSwapStatsMap();
    return viewers.filter((member) => {
      const stats = statsMap.get(
        this.memberKey(member.userId, member.workspaceId),
      );
      return (stats?.pending ?? 0) > 0;
    }).length;
  }

  private applyRoleFilter(
    qb: ReturnType<Repository<UserEntity>['createQueryBuilder']>,
    role?: string,
  ) {
    if (!role || role === 'all') {
      return;
    }

    if (role === 'admin') {
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1
            FROM workspace_member wm
            INNER JOIN workspace w ON w.id = wm."workspaceId"
            WHERE wm."userId" = employer.id
              AND w.mode = :orgMode
              AND wm."joinedAt" IS NOT NULL
              AND wm.role IN (:...adminRoles)
          )
          OR EXISTS (
            SELECT 1
            FROM workspace w
            WHERE w."ownerId" = employer.id
              AND w.mode = :orgMode
          )
        )`,
        {
          orgMode: WorkspaceModeEnum.ORGANIZATION,
          adminRoles: [OrganizationRoleEnum.OWNER, OrganizationRoleEnum.ADMIN],
        },
      );
      return;
    }

    const orgRoles =
      role === 'hr'
        ? [OrganizationRoleEnum.HR]
        : role === 'viewer'
          ? [OrganizationRoleEnum.VIEWER]
          : null;

    if (!orgRoles) {
      return;
    }

    qb.andWhere(
      `EXISTS (
        SELECT 1
        FROM workspace_member wm
        INNER JOIN workspace w ON w.id = wm."workspaceId"
        WHERE wm."userId" = employer.id
          AND w.mode = :orgMode
          AND wm."joinedAt" IS NOT NULL
          AND wm.role IN (:...orgRoles)
      )`,
      { orgMode: WorkspaceModeEnum.ORGANIZATION, orgRoles },
    );
  }

  private applySearchFilter(
    qb: ReturnType<Repository<UserEntity>['createQueryBuilder']>,
    search?: string,
  ) {
    if (!search?.trim()) {
      return;
    }

    const term = `%${search.trim()}%`;
    qb.andWhere(
      `(
        employer.firstName ILIKE :search
        OR employer.lastName ILIKE :search
        OR employer.email ILIKE :search
        OR CONCAT_WS(' ', employer.firstName, employer.lastName) ILIKE :search
        OR EXISTS (
          SELECT 1
          FROM workspace_member wm
          INNER JOIN workspace w ON w.id = wm."workspaceId"
          WHERE wm."userId" = employer.id
            AND w.mode = :orgMode
            AND wm."joinedAt" IS NOT NULL
            AND w.name ILIKE :search
        )
      )`,
      { search: term, orgMode: WorkspaceModeEnum.ORGANIZATION },
    );
  }

  private async buildCodeMap(): Promise<Map<string, number>> {
    const users = await this.userRepository.find({
      where: {
        activeRole: UserRoleEnum.EMPLOYER,
        isDeleted: false,
      },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });

    return new Map(users.map((user, index) => [user.id, index + 1]));
  }

  private async loadOrganizationMemberships(
    userIds: string[],
  ): Promise<Map<string, WorkspaceMemberEntity[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const members = await this.workspaceMemberRepository.find({
      where: {
        userId: In(userIds),
        joinedAt: Not(IsNull()),
      },
      relations: ['workspace', 'user'],
      order: { joinedAt: 'ASC' },
    });

    const map = new Map<string, WorkspaceMemberEntity[]>();
    for (const member of members) {
      if (member.workspace.mode !== WorkspaceModeEnum.ORGANIZATION) {
        continue;
      }
      const list = map.get(member.userId) ?? [];
      list.push(member);
      map.set(member.userId, list);
    }

    return map;
  }

  private async loadOwnedOrganizationWorkspaces(
    userIds: string[],
  ): Promise<Map<string, WorkspaceEntity[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const workspaces = await this.workspaceRepository.find({
      where: {
        ownerId: In(userIds),
        mode: WorkspaceModeEnum.ORGANIZATION,
      },
      order: { createdAt: 'ASC' },
    });

    const map = new Map<string, WorkspaceEntity[]>();
    for (const workspace of workspaces) {
      const list = map.get(workspace.ownerId) ?? [];
      list.push(workspace);
      map.set(workspace.ownerId, list);
    }

    return map;
  }

  private resolveHrContext(
    userId: string,
    memberships: WorkspaceMemberEntity[],
    ownedWorkspaces: WorkspaceEntity[],
  ): HrManagerContext {
    const primaryMember = this.pickPrimaryMembership(memberships);
    const ownedWorkspaceIds = new Set(ownedWorkspaces.map((workspace) => workspace.id));

    if (primaryMember) {
      const workspaceRole = ownedWorkspaceIds.has(primaryMember.workspaceId)
        ? OrganizationRoleEnum.OWNER
        : primaryMember.role;

      return {
        member: primaryMember,
        workspaceRole,
        organization: {
          id: primaryMember.workspace.id,
          name: primaryMember.workspace.name,
        },
      };
    }

    if (ownedWorkspaces.length > 0) {
      const workspace = ownedWorkspaces[0];
      return {
        member: null,
        workspaceRole: OrganizationRoleEnum.OWNER,
        organization: {
          id: workspace.id,
          name: workspace.name,
        },
      };
    }

    return {
      member: null,
      workspaceRole: null,
      organization: null,
    };
  }

  private pickPrimaryMembership(
    memberships: WorkspaceMemberEntity[],
  ): WorkspaceMemberEntity | null {
    if (memberships.length === 0) {
      return null;
    }

    return [...memberships].sort((left, right) => {
      const roleDiff = ROLE_PRIORITY[left.role] - ROLE_PRIORITY[right.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }

      const leftJoined = left.joinedAt?.getTime() ?? 0;
      const rightJoined = right.joinedAt?.getTime() ?? 0;
      return leftJoined - rightJoined;
    })[0];
  }

  private aggregateUserStats(
    userId: string,
    memberships: WorkspaceMemberEntity[],
    statsMap: Map<MemberKey, MemberSwapStats>,
  ): MemberSwapStats {
    const aggregated: MemberSwapStats = { ...EMPTY_STATS };

    for (const member of memberships) {
      const stats = statsMap.get(this.memberKey(userId, member.workspaceId));
      if (!stats) {
        continue;
      }

      aggregated.approved += stats.approved;
      aggregated.rejected += stats.rejected;
      aggregated.pending += stats.pending;
      aggregated.successfulSwaps += stats.successfulSwaps;

      if (
        stats.lastActivityAt &&
        (!aggregated.lastActivityAt || stats.lastActivityAt > aggregated.lastActivityAt)
      ) {
        aggregated.lastActivityAt = stats.lastActivityAt;
      }
    }

    return aggregated;
  }

  private memberKey(userId: string, workspaceId: string): MemberKey {
    return `${userId}:${workspaceId}`;
  }

  private getPaymentAmountCents(): number {
    const value = Number(this.configService.get('SWAP_PAYMENT_AMOUNT', 5000));
    return Number.isFinite(value) && value > 0 ? value : 5000;
  }

  private async buildSwapStatsMap(): Promise<Map<MemberKey, MemberSwapStats>> {
    const swaps = await this.swapRequestRepository.find({
      select: [
        'id',
        'workspaceAId',
        'workspaceBId',
        'managerAId',
        'managerBId',
        'status',
        'managerAConfirmed',
        'managerBConfirmed',
        'managerAConfirmedAt',
        'managerBConfirmedAt',
        'managerAJoinedAt',
        'managerBJoinedAt',
        'cancelledById',
        'cancelledByType',
        'cancelledAt',
        'updatedAt',
      ],
    });

    const map = new Map<MemberKey, MemberSwapStats>();

    const ensure = (key: MemberKey): MemberSwapStats => {
      if (!map.has(key)) {
        map.set(key, { ...EMPTY_STATS });
      }
      return map.get(key)!;
    };

    const trackActivity = (key: MemberKey, date: Date | null | undefined) => {
      if (!date) {
        return;
      }
      const stats = ensure(key);
      if (!stats.lastActivityAt || date > stats.lastActivityAt) {
        stats.lastActivityAt = date;
      }
    };

    for (const swap of swaps) {
      const sideA =
        swap.managerAId && swap.workspaceAId
          ? this.memberKey(swap.managerAId, swap.workspaceAId)
          : null;
      const sideB =
        swap.managerBId && swap.workspaceBId
          ? this.memberKey(swap.managerBId, swap.workspaceBId)
          : null;

      if (sideA) {
        const stats = ensure(sideA);
        if (swap.managerAConfirmed) {
          stats.approved++;
          trackActivity(sideA, swap.managerAConfirmedAt);
        }
        if (PENDING_STATUSES.includes(swap.status)) {
          stats.pending++;
        }
        if (swap.status === SwapStatusEnum.COMPLETED) {
          stats.successfulSwaps++;
          trackActivity(sideA, swap.updatedAt);
        }
        if (
          swap.status === SwapStatusEnum.CANCELLED &&
          swap.cancelledById === swap.managerAId &&
          (swap.cancelledByType === CancelledByTypeEnum.HR_A ||
            swap.cancelledByType === CancelledByTypeEnum.HR_B)
        ) {
          stats.rejected++;
          trackActivity(sideA, swap.cancelledAt);
        }
        trackActivity(sideA, swap.managerAJoinedAt);
      }

      if (sideB) {
        const stats = ensure(sideB);
        if (swap.managerBConfirmed) {
          stats.approved++;
          trackActivity(sideB, swap.managerBConfirmedAt);
        }
        if (PENDING_STATUSES.includes(swap.status)) {
          stats.pending++;
        }
        if (swap.status === SwapStatusEnum.COMPLETED) {
          stats.successfulSwaps++;
          trackActivity(sideB, swap.updatedAt);
        }
        if (
          swap.status === SwapStatusEnum.CANCELLED &&
          swap.cancelledById === swap.managerBId &&
          (swap.cancelledByType === CancelledByTypeEnum.HR_A ||
            swap.cancelledByType === CancelledByTypeEnum.HR_B)
        ) {
          stats.rejected++;
          trackActivity(sideB, swap.cancelledAt);
        }
        trackActivity(sideB, swap.managerBJoinedAt);
      }
    }

    return map;
  }

  private toListItem(
    user: UserEntity,
    context: HrManagerContext,
    codeNumber: number,
    stats: MemberSwapStats,
    paymentAmountCents: number,
  ): HrManagerListItemDto {
    const { member, workspaceRole, organization } = context;
    const uiRole = workspaceRole ? this.toUiRole(workspaceRole) : 'admin';
    const stuckPending =
      workspaceRole === OrganizationRoleEnum.VIEWER && stats.pending > 0;
    const status = this.resolveStatus(user, member, stats, stuckPending);
    const revenueAmount =
      stats.successfulSwaps > 0
        ? Math.round((stats.successfulSwaps * paymentAmountCents) / 100)
        : null;

    const lastActivityAt =
      stats.lastActivityAt ??
      member?.updatedAt ??
      member?.joinedAt ??
      user.updatedAt ??
      user.createdAt;

    return {
      id: member?.id ?? user.id,
      userId: user.id,
      code: `HR-${String(codeNumber).padStart(4, '0')}`,
      joinedAt: (member?.joinedAt ?? user.createdAt).toISOString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: uiRole,
      status,
      organization: {
        id: organization?.id ?? '',
        name: organization?.name ?? '—',
      },
      isSystemAdmin:
        workspaceRole === OrganizationRoleEnum.ADMIN ||
        workspaceRole === OrganizationRoleEnum.OWNER,
      alertMessage: stuckPending ? 'Tried to approve — needs HR role' : null,
      stats: {
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending,
        successfulSwaps: stats.successfulSwaps,
        stuckPending,
      },
      revenue: {
        amount: revenueAmount,
        description:
          stats.successfulSwaps > 0
            ? `${stats.successfulSwaps} completed swap${stats.successfulSwaps > 1 ? 's' : ''}`
            : workspaceRole === OrganizationRoleEnum.VIEWER
              ? "viewer can't approve"
              : status === 'inactive'
                ? 'inactive'
                : '—',
      },
      activity: {
        lastActionAt: lastActivityAt.toISOString(),
        lastAction: this.formatLastAction(lastActivityAt),
        detail: stuckPending
          ? 'Attempted approve'
          : this.formatActivityDetail(lastActivityAt, status),
        isWarning: stuckPending,
      },
    };
  }

  private toUiRole(role: OrganizationRoleEnum): HrManagerListItemDto['role'] {
    if (
      role === OrganizationRoleEnum.OWNER ||
      role === OrganizationRoleEnum.ADMIN
    ) {
      return 'admin';
    }
    if (role === OrganizationRoleEnum.HR) {
      return 'hr';
    }
    return 'viewer';
  }

  private resolveStatus(
    user: UserEntity,
    member: WorkspaceMemberEntity | null,
    stats: MemberSwapStats,
    stuckPending: boolean,
  ): HrManagerListItemDto['status'] {
    if (stuckPending) {
      return 'alert';
    }

    const referenceDate =
      stats.lastActivityAt ??
      member?.joinedAt ??
      user.updatedAt ??
      user.createdAt;
    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(inactiveThreshold.getDate() - INACTIVE_AFTER_DAYS);

    const hasNoActivity =
      stats.approved === 0 &&
      stats.rejected === 0 &&
      stats.pending === 0 &&
      stats.successfulSwaps === 0;

    if (hasNoActivity && referenceDate < inactiveThreshold) {
      return 'inactive';
    }

    return 'active';
  }

  private formatLastAction(date: Date): string {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Сьогодні, ${time}`;
    }
    if (isYesterday) {
      return `Вчора, ${time}`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatActivityDetail(
    date: Date,
    status: HrManagerListItemDto['status'],
  ): string {
    if (status === 'inactive') {
      const diffMs = Date.now() - date.getTime();
      const weeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
      return `~${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }

    const diffMs = Date.now() - date.getTime();
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 1) {
      return 'Active just now';
    }
    if (hours < 24) {
      return `Active ${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `Active ${days}d ago`;
  }
}
