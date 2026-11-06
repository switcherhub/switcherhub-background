import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { SwapListItemDto } from '../dto/swap-list-item.dto';
import { SwapsSummaryDto } from '../dto/swaps-summary.dto';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { SwapStatusEnum } from 'src/swap-request/types/swap-status.enum';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { WorkspaceMemberEntity } from 'src/workspace/entities/workspace-member.entity';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { OrganizationRoleEnum } from 'src/workspace/types/organization-role.enum';
import { WorkspaceModeEnum } from 'src/workspace/types/workspace-mode.enum';
import { LocationInterface } from 'src/location/types/location.interface';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';

const PAYMENT_FLOW_STATUSES: SwapStatusEnum[] = [
  SwapStatusEnum.PAYMENT_PENDING,
  SwapStatusEnum.PAYMENT_A_HOLD,
  SwapStatusEnum.PAYMENT_B_HOLD,
  SwapStatusEnum.PAYMENT_BOTH_HOLD,
  SwapStatusEnum.FIRST_PAYMENT_COMPLETED,
];

const CANCELLED_STATUSES: SwapStatusEnum[] = [
  SwapStatusEnum.CANCELLED,
  SwapStatusEnum.REFUNDED,
];

const PAYMENT_DUE_DAYS = 14;

type PaymentFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'cancelled';
type TierFilter = 'all' | 'partner' | 'mixed' | 'standard';

@Injectable()
export class SwapsAdminService {
  constructor(
    @InjectRepository(SwapRequestEntity)
    private readonly swapRequestRepository: Repository<SwapRequestEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly workspaceMemberRepository: Repository<WorkspaceMemberEntity>,
    private readonly configService: ConfigService,
  ) {}

  async getSummary(): Promise<SwapsSummaryDto> {
    const [total, executed, pendingPayment, allSwaps] = await Promise.all([
      this.swapRequestRepository.count(),
      this.swapRequestRepository.count({
        where: { status: SwapStatusEnum.COMPLETED },
      }),
      this.swapRequestRepository
        .createQueryBuilder('swap')
        .where('swap.status IN (:...statuses)', { statuses: PAYMENT_FLOW_STATUSES })
        .getCount(),
      this.swapRequestRepository.find({
        relations: [
          'resumeA',
          'resumeB',
          'managerA',
          'managerB',
          'workspaceA',
          'workspaceB',
        ],
      }),
    ]);

    const standardCents = this.getStandardAmountCents();
    const partnerCents = this.getPartnerAmountCents();
    const switcherCodeMap = await this.buildSwitcherCodeMap();
    const hrCodeMap = await this.buildHrCodeMap();

    let overdue = 0;
    let overdueOver60 = 0;
    let pendingAmountCents = 0;
    let revenueAllTimeCents = 0;
    let revenueThisMonthCents = 0;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    for (const swap of allSwaps) {
      const item = this.toListItem(
        swap,
        switcherCodeMap,
        hrCodeMap,
        standardCents,
        partnerCents,
      );

      if (item.paymentStatus === 'overdue') {
        overdue++;
        const maxOverdue = Math.max(
          ...item.invoices
            .map((invoice) => invoice.overdueDays ?? 0)
            .filter((days) => days > 0),
          0,
        );
        if (maxOverdue > 60) {
          overdueOver60++;
        }
      }

      if (PAYMENT_FLOW_STATUSES.includes(swap.status)) {
        const totalCents =
          item.invoices.reduce((sum, invoice) => sum + Number(invoice.amountCents), 0) ||
          Number(item.revenue.totalCents);
        const collectedCents = Number(item.revenue.collectedCents) || 0;
        pendingAmountCents += Math.max(0, totalCents - collectedCents);
      }

      if (swap.status === SwapStatusEnum.COMPLETED) {
        const totalCents =
          item.invoices.reduce((sum, invoice) => sum + Number(invoice.amountCents), 0) ||
          Number(item.revenue.totalCents);
        revenueAllTimeCents += totalCents;
        const completedAt = swap.completedAt ?? swap.updatedAt;
        if (completedAt >= monthStart) {
          revenueThisMonthCents += totalCents;
        }
      } else {
        const collectedCents = Number(item.revenue.collectedCents) || 0;
        revenueAllTimeCents += collectedCents;

        for (const invoice of item.invoices) {
          if (
            invoice.status === 'paid' &&
            invoice.paidAt &&
            new Date(invoice.paidAt) >= monthStart
          ) {
            revenueThisMonthCents += Number(invoice.amountCents) || 0;
          }
        }
      }
    }

    const executedPercent =
      total > 0 ? `${Math.round((executed / total) * 100)}%` : '0%';

    return {
      total,
      totalChange: null,
      executed,
      executedPercent,
      invoiceCount: executed * 2,
      pendingPayment,
      pendingAmountLabel:
        pendingAmountCents > 0
          ? `$${(pendingAmountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} awaiting`
          : null,
      overdue,
      overdueNote:
        overdueOver60 > 0 ? `⚠ ${overdueOver60} >60d` : null,
      revenueAllTime: Math.round(revenueAllTimeCents / 100),
      revenueChange: null,
      revenueThisMonth: Math.round(revenueThisMonthCents / 100),
      revenueThisMonthNote: null,
    };
  }

  async findAll(
    page?: string | number,
    perPage?: string | number,
    search?: string,
    paymentFilter?: string,
    tierFilter?: string,
  ): Promise<FilterResponseInterface<SwapListItemDto>> {
    const safePage = Math.max(1, Number(page) || 1);
    const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 20));
    const safePaymentFilter = (paymentFilter ?? 'all') as PaymentFilter;
    const safeTierFilter = (tierFilter ?? 'all') as TierFilter;

    const qb = this.swapRequestRepository
      .createQueryBuilder('swap')
      .leftJoinAndSelect('swap.resumeA', 'resumeA')
      .leftJoinAndSelect('swap.resumeB', 'resumeB')
      .leftJoinAndSelect('resumeA.user', 'userA')
      .leftJoinAndSelect('resumeB.user', 'userB')
      .leftJoinAndSelect('resumeA.jobCore', 'jobCoreA')
      .leftJoinAndSelect('resumeA.jobType', 'jobTypeA')
      .leftJoinAndSelect('resumeA.shiftType', 'shiftTypeA')
      .leftJoinAndSelect('swap.managerA', 'managerA')
      .leftJoinAndSelect('swap.managerB', 'managerB')
      .leftJoinAndSelect('swap.workspaceA', 'workspaceA')
      .leftJoinAndSelect('swap.workspaceB', 'workspaceB');

    this.applySearchFilter(qb, search);
    this.applyPaymentStatusFilter(qb, safePaymentFilter);

    const [swaps, total] = await qb
      .orderBy('swap.createdAt', 'DESC')
      .skip((safePage - 1) * safePerPage)
      .take(safePerPage)
      .getManyAndCount();

    const switcherCodeMap = await this.buildSwitcherCodeMap();
    const hrCodeMap = await this.buildHrCodeMap();
    const standardCents = this.getStandardAmountCents();
    const partnerCents = this.getPartnerAmountCents();

    let data = swaps.map((swap) =>
      this.toListItem(
        swap,
        switcherCodeMap,
        hrCodeMap,
        standardCents,
        partnerCents,
      ),
    );

    if (safeTierFilter !== 'all') {
      data = data.filter((item) => item.tier === safeTierFilter);
    }

    return {
      data,
      total: safeTierFilter === 'all' ? total : data.length,
      page: safePage,
      perPage: safePerPage,
      pageCount: Math.ceil((safeTierFilter === 'all' ? total : data.length) / safePerPage) || 1,
    };
  }

  private applySearchFilter(
    qb: SelectQueryBuilder<SwapRequestEntity>,
    search?: string,
  ): void {
    const term = search?.trim();
    if (!term) {
      return;
    }

    const like = `%${term.toLowerCase()}%`;
    qb.andWhere(
      new Brackets((sub) => {
        sub
          .where('LOWER(CAST(swap.numericId AS TEXT)) LIKE :like', { like })
          .orWhere('LOWER(swap.id::text) LIKE :like', { like })
          .orWhere('LOWER(swap.managerAEmail) LIKE :like', { like })
          .orWhere('LOWER(swap.managerBEmail) LIKE :like', { like })
          .orWhere('LOWER(swap.managerACode) LIKE :like', { like })
          .orWhere('LOWER(swap.managerBCode) LIKE :like', { like })
          .orWhere('LOWER(workspaceA.name) LIKE :like', { like })
          .orWhere('LOWER(workspaceB.name) LIKE :like', { like })
          .orWhere('LOWER(resumeA.firstName) LIKE :like', { like })
          .orWhere('LOWER(resumeB.firstName) LIKE :like', { like })
          .orWhere('LOWER(jobCoreA.title) LIKE :like', { like });
      }),
    );
  }

  private applyPaymentStatusFilter(
    qb: SelectQueryBuilder<SwapRequestEntity>,
    filter: PaymentFilter,
  ): void {
    if (filter === 'all') {
      return;
    }

    if (filter === 'paid') {
      qb.andWhere('swap.status = :status', { status: SwapStatusEnum.COMPLETED });
      return;
    }

    if (filter === 'cancelled') {
      qb.andWhere('swap.status IN (:...statuses)', {
        statuses: CANCELLED_STATUSES,
      });
      return;
    }

    if (filter === 'pending') {
      qb.andWhere('swap.status IN (:...statuses)', {
        statuses: PAYMENT_FLOW_STATUSES,
      });
      return;
    }

    if (filter === 'overdue') {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - PAYMENT_DUE_DAYS);

      qb.andWhere('swap.status IN (:...statuses)', {
        statuses: PAYMENT_FLOW_STATUSES,
      });
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where(
              'swap.managerAConfirmedAt IS NOT NULL AND swap.managerBConfirmedAt IS NOT NULL AND GREATEST(swap.managerAConfirmedAt, swap.managerBConfirmedAt) < :threshold',
              { threshold },
            )
            .andWhere(
              new Brackets((inner) => {
                inner
                  .where('swap.paymentAHold = false')
                  .orWhere('swap.paymentBHold = false');
              }),
            );
        }),
      );
    }
  }

  private toListItem(
    swap: SwapRequestEntity,
    switcherCodeMap: Map<string, number>,
    hrCodeMap: Map<string, number>,
    standardCents: number,
    partnerCents: number,
  ): SwapListItemDto {
    const companyA = this.mapCompany(swap.workspaceA, partnerCents, standardCents);
    const companyB = this.mapCompany(swap.workspaceB, partnerCents, standardCents);
    const tier = this.resolveTier(companyA.tier, companyB.tier);
    const amountA = Number(companyA.tier === 'partner' ? partnerCents : standardCents);
    const amountB = Number(companyB.tier === 'partner' ? partnerCents : standardCents);
    const totalCents = amountA + amountB;
    const isCancelled = CANCELLED_STATUSES.includes(swap.status);
    const isCompleted = swap.status === SwapStatusEnum.COMPLETED;

    const collectedCents =
      (swap.paymentAHold ? amountA : 0) + (swap.paymentBHold ? amountB : 0);

    const dueAt = this.resolveDueAt(swap);
    const invoiceA = this.mapInvoice(
      swap,
      'A',
      swap.workspaceA,
      swap.managerA,
      swap.managerAId,
      swap.workspaceAId,
      amountA,
      companyA.tier,
      swap.paymentAHold,
      swap.paymentAHoldAt,
      dueAt,
      isCancelled,
      isCompleted,
      hrCodeMap,
    );
    const invoiceB = this.mapInvoice(
      swap,
      'B',
      swap.workspaceB,
      swap.managerB,
      swap.managerBId,
      swap.workspaceBId,
      amountB,
      companyB.tier,
      swap.paymentBHold,
      swap.paymentBHoldAt,
      dueAt,
      isCancelled,
      isCompleted,
      hrCodeMap,
    );

    const invoices = [invoiceA, invoiceB];
    const paymentStatus = this.resolvePaymentStatus(
      swap,
      invoices,
      isCancelled,
      isCompleted,
    );

    const numericCode = swap.numericId ?? 0;
    const code = `SWP-${String(numericCode).padStart(4, '0')}`;

    return {
      id: swap.id,
      code,
      createdAt: swap.createdAt.toISOString(),
      participantA: this.mapParticipant(
        swap.resumeA,
        switcherCodeMap,
        swap.participantAFullName,
        swap.participantAPersonalEmail,
      ),
      participantB: this.mapParticipant(
        swap.resumeB,
        switcherCodeMap,
        swap.participantBFullName,
        swap.participantBPersonalEmail,
      ),
      hrManagerA: this.mapHrManager(
        swap.managerA,
        swap.managerAId,
        swap.workspaceAId,
        swap.workspaceA,
        hrCodeMap,
        swap.managerAEmail,
      ),
      hrManagerB: this.mapHrManager(
        swap.managerB,
        swap.managerBId,
        swap.workspaceBId,
        swap.workspaceB,
        hrCodeMap,
        swap.managerBEmail,
      ),
      companyA,
      companyB,
      position: this.mapPosition(swap.resumeA),
      revenue: {
        totalCents: isCancelled ? 0 : totalCents,
        collectedCents: isCancelled ? 0 : isCompleted ? totalCents : collectedCents,
        breakdownLabel: isCancelled
          ? null
          : this.buildRevenueBreakdown(amountA, amountB, companyA.tier, companyB.tier),
        progressLabel: isCancelled
          ? 'waived'
          : this.buildProgressLabel(collectedCents, totalCents, isCompleted),
        isWaived: isCancelled,
      },
      paymentStatus,
      paymentStatusDetail: this.buildPaymentStatusDetail(
        swap,
        paymentStatus,
        invoices,
        isCancelled,
      ),
      tier,
      isDisputed: false,
      disputeNote: null,
      invoices,
      collectionSummary: this.buildCollectionSummary(
        collectedCents,
        totalCents,
        isCancelled,
        isCompleted,
        invoices,
      ),
      completedInDays: this.resolveCompletedInDays(swap),
      cancellationNote: isCancelled
        ? `cancelled ${this.formatShortDate(swap.cancelledAt ?? swap.updatedAt)}`
        : null,
    };
  }

  private mapParticipant(
    resume: ResumeEntity | null | undefined,
    switcherCodeMap: Map<string, number>,
    swapFullName?: string | null,
    swapEmail?: string | null,
  ) {
    const user = resume?.user;
    const userId = resume?.userId ?? null;
    const codeNumber = userId ? switcherCodeMap.get(userId) : null;
    const displayName =
      swapFullName?.trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      resume?.firstName?.trim() ||
      swapEmail?.trim() ||
      user?.email?.trim() ||
      null;
    const email = swapEmail?.trim() || user?.email?.trim() || null;

    return {
      switcherCode: codeNumber ? `SW-${String(codeNumber).padStart(4, '0')}` : '—',
      userId,
      displayName,
      email,
    };
  }

  private mapHrManager(
    manager: UserEntity | null | undefined,
    managerId: string | null,
    workspaceId: string | null,
    workspace: WorkspaceEntity | null | undefined,
    hrCodeMap: Map<string, number>,
    fallbackEmail?: string | null,
  ) {
    const memberKey =
      managerId && workspaceId ? `${managerId}:${workspaceId}` : null;
    const hrNumber = memberKey ? hrCodeMap.get(memberKey) : null;
    const email = manager?.email?.trim() || fallbackEmail?.trim() || null;
    const displayName =
      [manager?.firstName, manager?.lastName].filter(Boolean).join(' ').trim() ||
      email ||
      null;

    return {
      code: hrNumber ? `HR-${String(hrNumber).padStart(4, '0')}` : null,
      userId: managerId,
      displayName,
      email,
      organizationName: workspace?.name ?? null,
    };
  }

  private mapCompany(
    workspace: WorkspaceEntity | null | undefined,
    _partnerCents: number,
    _standardCents: number,
  ): { name: string; initials: string; tier: 'partner' | 'standard' } {
    const name = workspace?.name ?? '—';
    const tier: 'partner' | 'standard' = 'standard';

    return {
      name,
      initials: this.buildInitials(name),
      tier,
    };
  }

  private mapPosition(resume: ResumeEntity | null | undefined) {
    if (!resume) {
      return { title: null, subtitle: null, route: null };
    }

    const subtitleParts = [resume.jobType?.title, resume.shiftType?.title].filter(
      Boolean,
    );

    const fromCity = this.formatCity(resume.locationHome);
    const toCity = this.formatCity(resume.location);
    let route: string | null = null;
    if (fromCity && toCity) {
      route = `${fromCity} → ${toCity}`;
    } else if (toCity) {
      route = toCity;
    }

    return {
      title: resume.jobCore?.title ?? null,
      subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : null,
      route,
    };
  }

  private mapInvoice(
    swap: SwapRequestEntity,
    side: 'A' | 'B',
    workspace: WorkspaceEntity | null | undefined,
    manager: UserEntity | null | undefined,
    managerId: string | null,
    workspaceId: string | null,
    amountCents: number,
    tier: 'partner' | 'standard',
    isPaid: boolean,
    paidAt: Date | null,
    dueAt: Date | null,
    isCancelled: boolean,
    isCompleted: boolean,
    hrCodeMap: Map<string, number>,
  ) {
    const suffix = side === 'A' ? 'a' : 'b';
    const numericCode = swap.numericId ?? 0;
    const memberKey =
      managerId && workspaceId ? `${managerId}:${workspaceId}` : null;
    const hrNumber = memberKey ? hrCodeMap.get(memberKey) : null;

    let status: 'paid' | 'pending' | 'overdue' | 'waived' = 'pending';
    if (isCancelled) {
      status = 'waived';
    } else if (isCompleted || isPaid) {
      status = 'paid';
    } else if (dueAt && dueAt < new Date()) {
      status = 'overdue';
    }

    const overdueDays =
      status === 'overdue' && dueAt
        ? Math.floor((Date.now() - dueAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return {
      id: `INV-${String(numericCode).padStart(4, '0')}${suffix}`,
      side,
      organizationName: workspace?.name ?? null,
      hrCode: hrNumber ? `HR-${String(hrNumber).padStart(4, '0')}` : null,
      hrEmail: manager?.email?.trim() || (side === 'A' ? swap.managerAEmail : swap.managerBEmail)?.trim() || null,
      amountCents,
      amountLabel: this.formatMoney(amountCents),
      rateLabel: tier === 'partner' ? 'partner rate' : 'standard rate',
      tier,
      status,
      dueAt: dueAt?.toISOString() ?? null,
      paidAt:
        isPaid && paidAt
          ? paidAt.toISOString()
          : isCompleted
            ? (swap.completedAt ?? swap.updatedAt).toISOString()
            : null,
      overdueDays,
      remindersCount: 0,
      lastReminderLabel: null,
      waivedReason: isCancelled ? 'swap cancelled before execution' : null,
    };
  }

  private resolvePaymentStatus(
    swap: SwapRequestEntity,
    invoices: { status: string }[],
    isCancelled: boolean,
    isCompleted: boolean,
  ): SwapListItemDto['paymentStatus'] {
    if (isCancelled) {
      return 'cancelled';
    }
    if (isCompleted) {
      return 'paid';
    }

    const hasOverdue = invoices.some((invoice) => invoice.status === 'overdue');
    if (hasOverdue) {
      return 'overdue';
    }

    const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length;
    if (paidCount === 1) {
      return 'partial';
    }

    if (PAYMENT_FLOW_STATUSES.includes(swap.status)) {
      return 'pending';
    }

    return 'pending';
  }

  private buildPaymentStatusDetail(
    swap: SwapRequestEntity,
    paymentStatus: SwapListItemDto['paymentStatus'],
    invoices: SwapListItemDto['invoices'],
    isCancelled: boolean,
  ): string | null {
    if (isCancelled) {
      return `user cancelled ${this.formatShortDate(swap.cancelledAt ?? swap.updatedAt)}`;
    }
    if (paymentStatus === 'paid') {
      return 'both on time';
    }
    if (paymentStatus === 'partial') {
      return '1 of 2 paid';
    }
    if (paymentStatus === 'overdue') {
      const maxDays = Math.max(
        ...invoices.map((invoice) => invoice.overdueDays ?? 0),
      );
      return maxDays > 0 ? `⚠ ${maxDays} days` : null;
    }
    if (paymentStatus === 'pending' && invoices[0]?.dueAt) {
      const due = new Date(invoices[0].dueAt);
      const daysLeft = Math.ceil(
        (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft > 0) {
        return `due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      }
      if (daysLeft === 0) {
        return 'due today';
      }
    }
    return null;
  }

  private buildCollectionSummary(
    collectedCents: number,
    totalCents: number,
    isCancelled: boolean,
    isCompleted: boolean,
    invoices: SwapListItemDto['invoices'],
  ): string | null {
    if (isCancelled) {
      return 'No financial impact · both sides waived';
    }

    const collectedLabel = this.formatMoney(collectedCents);
    const totalLabel = this.formatMoney(totalCents);
    const base = `Total collected: ${collectedLabel} / ${totalLabel}`;

    if (isCompleted) {
      return base;
    }

    const blocking = invoices.find(
      (invoice) => invoice.status === 'pending' || invoice.status === 'overdue',
    );
    if (blocking?.organizationName) {
      return `${base} · ${blocking.organizationName} blocking ${blocking.amountLabel}`;
    }

    return base;
  }

  private resolveDueAt(swap: SwapRequestEntity): Date | null {
    if (!swap.managerAConfirmedAt || !swap.managerBConfirmedAt) {
      return null;
    }

    const confirmedAt =
      swap.managerAConfirmedAt > swap.managerBConfirmedAt
        ? swap.managerAConfirmedAt
        : swap.managerBConfirmedAt;

    const due = new Date(confirmedAt);
    due.setDate(due.getDate() + PAYMENT_DUE_DAYS);
    return due;
  }

  private resolveCompletedInDays(swap: SwapRequestEntity): number | null {
    if (swap.status !== SwapStatusEnum.COMPLETED || !swap.completedAt) {
      return null;
    }

    const start = swap.createdAt;
    const diffMs = swap.completedAt.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  private resolveTier(
    tierA: 'partner' | 'standard',
    tierB: 'partner' | 'standard',
  ): SwapListItemDto['tier'] {
    if (tierA === 'partner' && tierB === 'partner') {
      return 'partner';
    }
    if (tierA === 'standard' && tierB === 'standard') {
      return 'standard';
    }
    return 'mixed';
  }

  private buildRevenueBreakdown(
    amountA: number,
    amountB: number,
    tierA: 'partner' | 'standard',
    tierB: 'partner' | 'standard',
  ): string | null {
    if (amountA === amountB) {
      const label = tierA === 'partner' ? 'partner' : 'std';
      return `2×${this.formatMoney(amountA)} ${label}`;
    }
    return `${this.formatMoney(amountA)} + ${this.formatMoney(amountB)}`;
  }

  private buildProgressLabel(
    collectedCents: number,
    totalCents: number,
    isCompleted: boolean,
  ): string | null {
    if (isCompleted || collectedCents >= totalCents) {
      return null;
    }
    return `${this.formatMoney(collectedCents)} / ${this.formatMoney(totalCents)} paid`;
  }

  private async buildSwitcherCodeMap(): Promise<Map<string, number>> {
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
      .andWhere('user.activeRole = :employerRole', {
        employerRole: UserRoleEnum.EMPLOYER,
      })
      .orderBy('wm.joinedAt', 'ASC')
      .getMany();

    return new Map(
      members.map((member, index) => [
        `${member.userId}:${member.workspaceId}`,
        index + 1,
      ]),
    );
  }

  private getStandardAmountCents(): number {
    return this.parseAmountCents('SWAP_PAYMENT_AMOUNT', 14900);
  }

  private getPartnerAmountCents(): number {
    return this.parseAmountCents('SWAP_PARTNER_PAYMENT_AMOUNT', 14900);
  }

  private parseAmountCents(key: string, fallback: number): number {
    const value = Number(this.configService.get(key, fallback));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private formatMoney(cents: number): string {
    return `$${(Number(cents) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  private formatCity(location: LocationInterface | null | undefined): string | null {
    if (!location) {
      return null;
    }
    return location.city || location.area || location.state || null;
  }

  private buildInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '—';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
