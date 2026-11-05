import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { SwapStatusEnum } from 'src/swap-request/types/swap-status.enum';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { LocationInterface } from 'src/location/types/location.interface';
import { WorkspaceMemberEntity } from 'src/workspace/entities/workspace-member.entity';
import { WorkspaceModeEnum } from 'src/workspace/types/workspace-mode.enum';
import { OrganizationRoleEnum } from 'src/workspace/types/organization-role.enum';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { SwitcherListItemDto } from '../dto/switcher-list-item.dto';
import { SwitchersSummaryDto } from '../dto/switchers-summary.dto';
import { UpdateSwitcherDto } from '../dto/update-switcher.dto';

const PENDING_STATUSES = [
  SwapStatusEnum.CREATED,
  SwapStatusEnum.PARTICIPANTS_CONFIRMED,
  SwapStatusEnum.HR_INVITED,
  SwapStatusEnum.HR_A_JOINED,
  SwapStatusEnum.HR_B_JOINED,
  SwapStatusEnum.HR_BOTH_JOINED,
  SwapStatusEnum.HR_A_CONFIRMED,
  SwapStatusEnum.HR_B_CONFIRMED,
  SwapStatusEnum.HR_BOTH_CONFIRMED,
  SwapStatusEnum.PAYMENT_PENDING,
];

const PAYMENT_IN_PROGRESS_STATUSES = [
  SwapStatusEnum.PAYMENT_A_HOLD,
  SwapStatusEnum.PAYMENT_B_HOLD,
  SwapStatusEnum.PAYMENT_BOTH_HOLD,
  SwapStatusEnum.FIRST_PAYMENT_COMPLETED,
];

const STUCK_PENDING_DAYS = 7;

type UserSwapStats = {
  total: number;
  pending: number;
  inPayment: number;
  rejected: number;
  successful: number;
  lastRejectedAt: Date | null;
  pendingSince: Date | null;
  successfulSwapAt: Date | null;
};

type HrContext = {
  email: string | null;
  code: string | null;
  organizationName: string | null;
  planLabel: string | null;
};

@Injectable()
export class SwitchersAdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepository: Repository<ResumeEntity>,
    @InjectRepository(SwapRequestEntity)
    private readonly swapRequestRepository: Repository<SwapRequestEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly workspaceMemberRepository: Repository<WorkspaceMemberEntity>,
  ) {}

  async getSummary(): Promise<SwitchersSummaryDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const stuckBefore = new Date(now);
    stuckBefore.setDate(stuckBefore.getDate() - STUCK_PENDING_DAYS);

    const [total, blocked, active, swapRequestsThisMonth, pending, stuckPending, successfulSwaps] =
      await Promise.all([
        this.countSwitchers(),
        this.countBlockedSwitchers(now),
        this.countActiveSwitchers(now),
        this.swapRequestRepository
          .createQueryBuilder('swap')
          .where('swap.createdAt >= :monthStart', { monthStart })
          .getCount(),
        this.swapRequestRepository.count({
          where: { status: In(PENDING_STATUSES) },
        }),
        this.swapRequestRepository
          .createQueryBuilder('swap')
          .where('swap.status IN (:...statuses)', { statuses: PENDING_STATUSES })
          .andWhere('swap.createdAt < :stuckBefore', { stuckBefore })
          .getCount(),
        this.swapRequestRepository.count({
          where: { status: SwapStatusEnum.COMPLETED },
        }),
      ]);

    const activePercent =
      total > 0 ? `${Math.round((active / total) * 100)}%` : '0%';

    return {
      total,
      totalChange: null,
      active,
      activePercent,
      activeChange: null,
      swapRequestsThisMonth,
      swapRequestsChange: null,
      pending,
      pendingNote:
        stuckPending > 0
          ? `Waiting match · ⚠ ${stuckPending} stuck >${STUCK_PENDING_DAYS}d`
          : 'Waiting match',
      successfulSwaps,
      successfulSwapsChange: null,
      blocked,
      blockedNote: blocked > 0 ? 'Fraud / misuse' : null,
    };
  }

  async findAll(
    page?: string | number,
    perPage?: string | number,
    search?: string,
  ): Promise<FilterResponseInterface<SwitcherListItemDto>> {
    const safePage = Math.max(1, Number(page) || 1);
    const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 20));
    const offset = (safePage - 1) * safePerPage;

    const qb = this.userRepository
      .createQueryBuilder('switcher')
      .where('switcher.activeRole = :role', { role: UserRoleEnum.SWITCHER })
      .andWhere('switcher.isDeleted = false');

    this.applySearchFilter(qb, search);

    const [users, total] = await qb
      .orderBy('switcher.createdAt', 'ASC')
      .skip(offset)
      .take(safePerPage)
      .getManyAndCount();

    const userIds = users.map((user) => user.id);
    const [codeMap, resumesMap, statsMap, hrMap] = await Promise.all([
      this.buildCodeMap(),
      this.buildResumesMap(userIds),
      this.buildSwapStatsMap(userIds),
      this.buildHrContextMap(userIds),
    ]);

    const data = users.map((user) =>
      this.toListItem(
        user,
        codeMap.get(user.id) ?? 1,
        resumesMap.get(user.id) ?? [],
        statsMap.get(user.id),
        hrMap.get(user.id) ?? null,
      ),
    );

    return {
      data,
      total,
      page: safePage,
      perPage: safePerPage,
      pageCount: Math.ceil(total / safePerPage) || 1,
    };
  }

  async findOne(userId: string): Promise<SwitcherListItemDto> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        activeRole: UserRoleEnum.SWITCHER,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Switcher not found');
    }

    return this.buildListItemForUser(user);
  }

  async update(userId: string, dto: UpdateSwitcherDto): Promise<SwitcherListItemDto> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        activeRole: UserRoleEnum.SWITCHER,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Switcher not found');
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName?.trim() || null;
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName?.trim() || null;
    }

    await this.userRepository.save(user);

    return this.buildListItemForUser(user);
  }

  private async buildListItemForUser(user: UserEntity): Promise<SwitcherListItemDto> {
    const [codeMap, resumesMap, statsMap, hrMap] = await Promise.all([
      this.buildCodeMap(),
      this.buildResumesMap([user.id]),
      this.buildSwapStatsMap([user.id]),
      this.buildHrContextMap([user.id]),
    ]);

    return this.toListItem(
      user,
      codeMap.get(user.id) ?? 1,
      resumesMap.get(user.id) ?? [],
      statsMap.get(user.id),
      hrMap.get(user.id) ?? null,
    );
  }

  private async countSwitchers(): Promise<number> {
    return this.userRepository.count({
      where: {
        activeRole: UserRoleEnum.SWITCHER,
        isDeleted: false,
      },
    });
  }

  private async countBlockedSwitchers(now: Date): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.activeRole = :role', { role: UserRoleEnum.SWITCHER })
      .andWhere('user.isDeleted = false')
      .andWhere('user.blockExpireAt IS NOT NULL')
      .andWhere('user.blockExpireAt > :now', { now })
      .getCount();
  }

  private async countActiveSwitchers(now: Date): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.activeRole = :role', { role: UserRoleEnum.SWITCHER })
      .andWhere('user.isDeleted = false')
      .andWhere(
        '(user.blockExpireAt IS NULL OR user.blockExpireAt <= :now)',
        { now },
      )
      .getCount();
  }

  private applySearchFilter(
    qb: ReturnType<Repository<UserEntity>['createQueryBuilder']>,
    search?: string,
  ) {
    if (!search?.trim()) {
      return;
    }

    qb.andWhere(
      `(switcher.firstName ILIKE :search OR switcher.lastName ILIKE :search OR switcher.email ILIKE :search OR CONCAT_WS(' ', switcher.firstName, switcher.lastName) ILIKE :search)`,
      { search: `%${search.trim()}%` },
    );
  }

  private async buildCodeMap(): Promise<Map<string, number>> {
    const users = await this.userRepository.find({
      where: {
        activeRole: UserRoleEnum.SWITCHER,
        isDeleted: false,
      },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });

    return new Map(users.map((user, index) => [user.id, index + 1]));
  }

  private async buildResumesMap(
    userIds: string[],
  ): Promise<Map<string, ResumeEntity[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const resumes = await this.resumeRepository.find({
      where: {
        userId: In(userIds),
        deletedAt: IsNull(),
      },
      relations: ['jobCore', 'jobType', 'workEnvironment', 'shiftType'],
      order: { createdAt: 'DESC' },
    });

    const map = new Map<string, ResumeEntity[]>();
    for (const resume of resumes) {
      if (!resume.userId) {
        continue;
      }
      const list = map.get(resume.userId) ?? [];
      list.push(resume);
      map.set(resume.userId, list);
    }

    return map;
  }

  private pickPrimaryResume(resumes: ResumeEntity[]): ResumeEntity | null {
    if (resumes.length === 0) {
      return null;
    }

    const activeResumes = resumes.filter((resume) => resume.isActive);
    return activeResumes[0] ?? resumes[0];
  }

  private mapResumeDto(resume: ResumeEntity) {
    return {
      id: resume.id,
      lines: this.buildPositionLines(resume),
      isActive: resume.isActive,
    };
  }

  private async buildSwapStatsMap(
    userIds: string[],
  ): Promise<Map<string, UserSwapStats>> {
    const map = new Map<string, UserSwapStats>();
    if (userIds.length === 0) {
      return map;
    }

    const swaps = await this.swapRequestRepository
      .createQueryBuilder('swap')
      .leftJoinAndSelect('swap.resumeA', 'resumeA')
      .leftJoinAndSelect('swap.resumeB', 'resumeB')
      .where('resumeA.userId IN (:...userIds)', { userIds })
      .orWhere('resumeB.userId IN (:...userIds)', { userIds })
      .orWhere('swap.createdById IN (:...userIds)', { userIds })
      .getMany();

    const ensure = (userId: string): UserSwapStats => {
      if (!map.has(userId)) {
        map.set(userId, {
          total: 0,
          pending: 0,
          inPayment: 0,
          rejected: 0,
          successful: 0,
          lastRejectedAt: null,
          pendingSince: null,
          successfulSwapAt: null,
        });
      }
      return map.get(userId)!;
    };

    const trackDate = (
      current: Date | null,
      candidate: Date | null | undefined,
    ): Date | null => {
      if (!candidate) {
        return current;
      }
      if (!current || candidate > current) {
        return candidate;
      }
      return current;
    };

    for (const swap of swaps) {
      const participantIds = new Set<string>();
      if (swap.resumeA?.userId) {
        participantIds.add(swap.resumeA.userId);
      }
      if (swap.resumeB?.userId) {
        participantIds.add(swap.resumeB.userId);
      }
      if (swap.createdById) {
        participantIds.add(swap.createdById);
      }

      for (const userId of participantIds) {
        if (!userIds.includes(userId)) {
          continue;
        }

        const stats = ensure(userId);
        stats.total++;

        if (PENDING_STATUSES.includes(swap.status)) {
          stats.pending++;
          stats.pendingSince = trackDate(stats.pendingSince, swap.createdAt);
        }

        if (PAYMENT_IN_PROGRESS_STATUSES.includes(swap.status)) {
          stats.inPayment++;
        }

        if (swap.status === SwapStatusEnum.CANCELLED) {
          stats.rejected++;
          stats.lastRejectedAt = trackDate(
            stats.lastRejectedAt,
            swap.cancelledAt ?? swap.updatedAt,
          );
        }

        if (swap.status === SwapStatusEnum.COMPLETED) {
          stats.successful++;
          stats.successfulSwapAt = trackDate(
            stats.successfulSwapAt,
            swap.updatedAt,
          );
        }
      }
    }

    return map;
  }

  private async buildHrContextMap(
    userIds: string[],
  ): Promise<Map<string, HrContext>> {
    const map = new Map<string, HrContext>();
    if (userIds.length === 0) {
      return map;
    }

    const swaps = await this.swapRequestRepository
      .createQueryBuilder('swap')
      .leftJoinAndSelect('swap.resumeA', 'resumeA')
      .leftJoinAndSelect('swap.resumeB', 'resumeB')
      .leftJoinAndSelect('swap.managerA', 'managerA')
      .leftJoinAndSelect('swap.managerB', 'managerB')
      .leftJoinAndSelect('swap.workspaceA', 'workspaceA')
      .leftJoinAndSelect('swap.workspaceB', 'workspaceB')
      .where('resumeA.userId IN (:...userIds)', { userIds })
      .orWhere('resumeB.userId IN (:...userIds)', { userIds })
      .orderBy('swap.updatedAt', 'DESC')
      .getMany();

    const hrCodeMap = await this.buildHrCodeMap();

    for (const swap of swaps) {
      const sideAUserId = swap.resumeA?.userId ?? null;
      const sideBUserId = swap.resumeB?.userId ?? null;

      if (sideAUserId && userIds.includes(sideAUserId) && !map.has(sideAUserId)) {
        map.set(
          sideAUserId,
          this.resolveHrContext(
            swap.managerA,
            swap.workspaceA,
            hrCodeMap,
          ),
        );
      }

      if (sideBUserId && userIds.includes(sideBUserId) && !map.has(sideBUserId)) {
        map.set(
          sideBUserId,
          this.resolveHrContext(
            swap.managerB,
            swap.workspaceB,
            hrCodeMap,
          ),
        );
      }
    }

    return map;
  }

  private resolveHrContext(
    manager: UserEntity | null,
    workspace: { id: string; name: string } | null,
    hrCodeMap: Map<string, number>,
  ): HrContext {
    if (!manager && !workspace) {
      return {
        email: null,
        code: null,
        organizationName: null,
        planLabel: null,
      };
    }

    const memberKey =
      manager && workspace ? `${manager.id}:${workspace.id}` : null;

    return {
      email: manager?.email ?? null,
      code:
        memberKey && hrCodeMap.has(memberKey)
          ? `HR-${String(hrCodeMap.get(memberKey)).padStart(4, '0')}`
          : null,
      organizationName: workspace?.name ?? null,
      planLabel: null,
    };
  }

  private async buildHrCodeMap(): Promise<Map<string, number>> {
    const members = await this.workspaceMemberRepository
      .createQueryBuilder('wm')
      .innerJoin('wm.workspace', 'workspace')
      .innerJoin('wm.user', 'user')
      .where('workspace.mode = :mode', { mode: WorkspaceModeEnum.ORGANIZATION })
      .andWhere('wm.joinedAt IS NOT NULL')
      .andWhere('wm.role IN (:...roles)', {
        roles: [
          OrganizationRoleEnum.OWNER,
          OrganizationRoleEnum.ADMIN,
          OrganizationRoleEnum.HR,
          OrganizationRoleEnum.VIEWER,
        ],
      })
      .andWhere('user.isDeleted = false')
      .orderBy('wm.createdAt', 'ASC')
      .select(['wm.userId', 'wm.workspaceId'])
      .getMany();

    return new Map(
      members.map((member, index) => [
        `${member.userId}:${member.workspaceId}`,
        index + 1,
      ]),
    );
  }

  private toListItem(
    user: UserEntity,
    codeNumber: number,
    resumes: ResumeEntity[],
    stats: UserSwapStats | undefined,
    hrContext: HrContext | null,
  ): SwitcherListItemDto {
    const isBlocked = !!user.blockExpireAt && user.blockExpireAt > new Date();
    const pendingIsStuck =
      !!stats?.pendingSince &&
      stats.pendingSince <
        new Date(Date.now() - STUCK_PENDING_DAYS * 24 * 60 * 60 * 1000);
    const primaryResume = this.pickPrimaryResume(resumes);
    const resumeDtos = resumes.map((resume) => this.mapResumeDto(resume));
    const primaryLines = primaryResume ? this.buildPositionLines(primaryResume) : [];

    return {
      id: user.id,
      code: `SW-${String(codeNumber).padStart(4, '0')}`,
      joinedAt: user.createdAt.toISOString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: isBlocked ? 'blocked' : 'active',
      position: {
        lines: primaryLines,
        resumeCount: resumes.length,
      },
      resumes: resumeDtos,
      hrManager: isBlocked
        ? {
            email: null,
            code: null,
            organizationName: null,
            planLabel: null,
            isBlocked: true,
          }
        : hrContext
          ? { ...hrContext, isBlocked: false }
          : null,
      requests: {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        inPayment: stats?.inPayment ?? 0,
        rejected: stats?.rejected ?? 0,
        lastRejectedAt: stats?.lastRejectedAt?.toISOString() ?? null,
        pendingSince: stats?.pendingSince?.toISOString() ?? null,
        pendingIsStuck,
        successfulSwapAt: stats?.successfulSwapAt?.toISOString() ?? null,
        note: isBlocked ? '— blocked before action' : null,
      },
      app: {
        platform: user.appleId ? 'iOS' : user.googleId ? 'Android' : null,
        opensThisMonth: primaryResume?.views ?? null,
        lastOpenLabel: null,
        isBlocked,
      },
      activity: {
        label: user.updatedAt.toISOString(),
        detail: isBlocked
          ? `blocked · ${this.formatRelative(user.blockExpireAt ?? user.updatedAt)}`
          : this.formatRelative(user.updatedAt),
        isWarning: isBlocked,
      },
    };
  }

  private buildPositionLines(resume: ResumeEntity | null): string[] {
    if (!resume) {
      return [];
    }

    const lines: string[] = [];
    if (resume.workEnvironment?.title) {
      lines.push(resume.workEnvironment.title);
    }
    if (resume.jobCore?.title) {
      lines.push(resume.jobCore.title);
    }
    if (resume.jobType?.title) {
      lines.push(resume.jobType.title);
    }
    if (resume.shiftType?.title) {
      lines.push(resume.shiftType.title);
    }
    if (resume.salaryHourly != null) {
      lines.push(`$${resume.salaryHourly.toFixed(2)}/год`);
    }

    const fromCity = this.formatCity(resume.locationHome);
    const toCity = this.formatCity(resume.location);
    if (fromCity && toCity) {
      lines.push(`${fromCity} → ${toCity}`);
    } else if (toCity) {
      lines.push(toCity);
    }

    return lines;
  }

  private formatCity(location: LocationInterface | null | undefined): string | null {
    if (!location) {
      return null;
    }
    return location.city || location.area || location.state || null;
  }

  private formatRelative(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours <= 0) {
        return 'just now';
      }
      return `~${diffHours}h ago`;
    }

    if (diffDays === 1) {
      return '1 day ago';
    }

    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
}
