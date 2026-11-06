import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Not } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { SwapRequestEntity } from '../entities/swap-request.entity';
import { SwapStatusEnum } from '../types/swap-status.enum';
import { CancelledByTypeEnum } from '../types/cancelled-by-type.enum';
import { SwapRequestCreateDto } from '../dto/swap-request-create.dto';
import { SwapRequestStatusType } from '../dto/swap-request-response.dto';
import { ParticipantConfirmDto } from '../dto/participant-confirm.dto';
import { HrInviteDto } from '../dto/hr-invite.dto';
import { HrJoinDto } from '../dto/hr-join.dto';
import { PaymentIntentCreateDto } from '../dto/payment-intent-create.dto';
import { ResumeService } from 'src/resume/services/resume.service';
import { UserService } from 'src/users/services/user.service';
import { MailService } from 'src/mail/mail.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatService } from 'src/chat/services/chat.service';
import { IFilterQuery } from 'typeorm-dynamic-filters';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { WorkspacePaymentMethodService } from 'src/workspace/services/workspace-payment-method.service';
import { ConsentService } from 'src/consent/consent.service';
import { FeatureFlags } from 'src/app/feature-flags';
import { HrDecisionEnum } from '../types/hr-decision.enum';
import { WorkspaceService } from 'src/workspace/services/workspace.service';
import { OrganizationRoleEnum } from 'src/workspace/types/organization-role.enum';
import { ForbiddenException } from '@nestjs/common';
import { DashboardStatisticsDto } from '../dto/dashboard-statistics.dto';
import {
  DashboardStatisticsByManagerDto,
  DashboardStatisticsByManagerItemDto,
  ManagerInfoDto,
} from '../dto/dashboard-statistics-by-manager.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { ResumeComparisonService } from 'src/resume-comparison/services/resume-comparison.service';
import { MessageTypeEnum } from 'src/message/types/message-type.enum';
import { NotificationService } from 'src/notification/services/notification.service';
import { NotificationTypeEnum } from 'src/notification/types/notification-type.enum';

const INVITE_HR_THROTTLE_MS = 1 * 60 * 1000; // 1 хвилина

@Injectable()
export class SwapRequestService {
  private readonly logger = new Logger(SwapRequestService.name);
  private stripe: Stripe;
  private stripeSecretMode: 'live' | 'test' | 'unknown' = 'unknown';
  private lastHrInviteAt = new Map<string, number>();

  constructor(
    @InjectRepository(SwapRequestEntity)
    private swapRequestRepository: Repository<SwapRequestEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private resumeService: ResumeService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private mailService: MailService,
    private configService: ConfigService,
    private chatService: ChatService,
    private notificationService: NotificationService,
    private resumeComparisonService: ResumeComparisonService,
    @Inject(forwardRef(() => WorkspacePaymentMethodService))
    private workspacePaymentMethodService: WorkspacePaymentMethodService,
    @Inject(forwardRef(() => WorkspaceService))
    private workspaceService: WorkspaceService,
    private consentService: ConsentService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
      this.stripeSecretMode = stripeSecretKey.startsWith('sk_live_')
        ? 'live'
        : stripeSecretKey.startsWith('sk_test_')
          ? 'test'
          : 'unknown';
      this.logger.log(
        `Stripe initialized: secret key mode=${this.stripeSecretMode} (use the same Test/Live toggle in Stripe Dashboard when searching Payment Intents).`,
      );
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not configured. Payment features will not work.',
      );
    }
  }

  private logStripeError(context: string, err: unknown): void {
    if (err instanceof Stripe.errors.StripeError) {
      this.logger.error(
        `[PaymentIntent] Stripe API (${context}): type=${err.type} code=${err.code ?? 'n/a'} message=${err.message}`,
      );
    } else {
      this.logger.error(
        `[PaymentIntent] (${context}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Статуси PI, для яких можна повернути clientSecret і продовжити оплату без створення нового PI. */
  private canReuseRetrievedPaymentIntent(pi: Stripe.PaymentIntent): boolean {
    const reusable: Stripe.PaymentIntent.Status[] = [
      'requires_payment_method',
      'requires_confirmation',
      'requires_capture',
      'processing',
      'requires_action',
      'succeeded',
    ];
    return reusable.includes(pi.status);
  }

  /** Після canceled / відсутнього PI в Stripe — скидаємо посилання та hold, щоб створити новий PI. */
  private async clearStaleStoredPaymentIntentForSide(
    swapRequest: SwapRequestEntity,
    side: 'A' | 'B',
  ): Promise<void> {
    if (side === 'A') {
      swapRequest.stripePaymentIntentIdA = null;
      swapRequest.paymentAHold = false;
      swapRequest.paymentAHoldAt = null;
      if (
        swapRequest.status === SwapStatusEnum.PAYMENT_A_HOLD ||
        swapRequest.status === SwapStatusEnum.PAYMENT_BOTH_HOLD
      ) {
        swapRequest.status = swapRequest.paymentBHold
          ? SwapStatusEnum.PAYMENT_B_HOLD
          : SwapStatusEnum.PAYMENT_PENDING;
      }
    } else {
      swapRequest.stripePaymentIntentIdB = null;
      swapRequest.paymentBHold = false;
      swapRequest.paymentBHoldAt = null;
      if (
        swapRequest.status === SwapStatusEnum.PAYMENT_B_HOLD ||
        swapRequest.status === SwapStatusEnum.PAYMENT_BOTH_HOLD
      ) {
        swapRequest.status = swapRequest.paymentAHold
          ? SwapStatusEnum.PAYMENT_A_HOLD
          : SwapStatusEnum.PAYMENT_PENDING;
      }
    }
    await this.swapRequestRepository.save(swapRequest);
  }

  /**
   * Повертає обмежену інформацію про swap та резюме для менеджера (HR) за унікальним кодом.
   * Використовується для попереднього перегляду перед приєднанням.
   */
  async getPreviewByManagerCode(code: string) {
    const swapRequest = await this.swapRequestRepository.findOne({
      where: [{ managerACode: code }, { managerBCode: code }],
      relations: [
        'resumeA',
        'resumeA.jobCore',
        'resumeA.jobType',
        'resumeA.workEnvironment',
        'resumeB',
        'resumeB.jobCore',
        'resumeB.jobType',
        'resumeB.workEnvironment',
      ],
    });

    if (!swapRequest) {
      throw new NotFoundException('Invalid code');
    }

    return {
      swapId: swapRequest.id,
      numericId: swapRequest.numericId,
      createdAt: swapRequest.createdAt,
      score: swapRequest.score,
      mySide: swapRequest.managerACode === code ? 'A' : 'B',
      resumeA: swapRequest.resumeA && {
        id: swapRequest.resumeA.id,
        workEnvironment: swapRequest.resumeA.workEnvironment,
        jobCore: swapRequest.resumeA.jobCore,
        jobType: swapRequest.resumeA.jobType,
        hoursPerMonth: swapRequest.resumeA.hoursPerMonth,
      },
      resumeB: swapRequest.resumeB && {
        id: swapRequest.resumeB.id,
        workEnvironment: swapRequest.resumeB.workEnvironment,
        jobCore: swapRequest.resumeB.jobCore,
        jobType: swapRequest.resumeB.jobType,
        hoursPerMonth: swapRequest.resumeB.hoursPerMonth,
      },
    };
  }

  /** Наступний числовий ID для нової заявки (max(numericId) + 1). */
  private async getNextNumericId(): Promise<number> {
    const result = await this.swapRequestRepository
      .createQueryBuilder('sr')
      .select('COALESCE(MAX(sr.numericId), 0) + 1', 'next')
      .getRawOne<{ next: string }>();
    return Number(result?.next ?? 1);
  }

  async create(
    createDto: SwapRequestCreateDto,
    createdById: string,
  ): Promise<SwapRequestEntity> {
    // Перевірка що резюме існують
    await this.resumeService.findOneOrFail(createDto.resumeAId);
    await this.resumeService.findOneOrFail(createDto.resumeBId);

    // Перевірка що менеджери існують (якщо передані)
    if (createDto.managerAId) {
      await this.userService.findOneOrFail(createDto.managerAId);
    }
    if (createDto.managerBId) {
      await this.userService.findOneOrFail(createDto.managerBId);
    }

    // Перевірка що ця пара резюме ще не бере участь в іншому свапі
    const existingSwap = await this.swapRequestRepository.findOne({
      where: [
        {
          resumeAId: createDto.resumeAId,
          resumeBId: createDto.resumeBId,
        },
        {
          resumeAId: createDto.resumeBId,
          resumeBId: createDto.resumeAId,
        },
      ],
    });
    if (existingSwap) {
      throw new BadRequestException(
        'Swap request for this pair of resumes already exists.',
      );
    }

    let score: number | null = null;
    let comparison: SwapRequestEntity['comparison'] = null;
    try {
      const result =
        await this.resumeComparisonService.calculateScoreAndComparisonForSwap(
          createDto.resumeAId,
          createDto.resumeBId,
        );
      score = result.totalScore;
      comparison = result.comparison as SwapRequestEntity['comparison'];
    } catch {
      // Create swap without score/comparison if calculation fails (e.g. missing location)
    }

    const numericId = await this.getNextNumericId();
    const swapRequest = this.swapRequestRepository.create({
      ...createDto,
      createdById,
      status: SwapStatusEnum.CREATED,
      score,
      comparison,
      numericId,
    });

    const savedSwapRequest = await this.swapRequestRepository.save(swapRequest);

    // Чат створюється між світчерами (власниками резюме A та B), лише коли обидва в системі
    const swapWithResumes = await this.swapRequestRepository.findOne({
      where: { id: savedSwapRequest.id },
      relations: ['resumeA', 'resumeB'],
    });
    const switcherAId = swapWithResumes?.resumeA?.userId ?? null;
    const switcherBId = swapWithResumes?.resumeB?.userId ?? null;
    if (switcherAId && switcherBId) {
      try {
        const chat = await this.chatService.createSwapRequestChat(
          savedSwapRequest.id,
          switcherAId,
          switcherBId,
        );
        // Повідомлення від імені того, хто створив заявку (якщо це один із світчерів)
        if (chat && savedSwapRequest.createdById) {
          const isCreatorSwitcher =
            savedSwapRequest.createdById === switcherAId ||
            savedSwapRequest.createdById === switcherBId;
          if (isCreatorSwitcher) {
            const createdByUser = await this.userRepository.findOne({
              where: { id: savedSwapRequest.createdById },
            });
            if (createdByUser) {
              const text =
                savedSwapRequest.description?.trim() ||
                "I'm interested in the swap";
              await this.chatService.sendMessageToChat(
                chat.id,
                createdByUser,
                {
                  type: MessageTypeEnum.TEXT,
                  text,
                  chatId: chat.id,
                  payload: undefined,
                  userId: createdByUser.id,
                },
                false,
                false,
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to create chat for swap request:', error);
      }
    }

    // Якщо менеджери вже призначені і вони в організаціях - прив'язуємо організації
    await this.syncManagerWorkspaces(savedSwapRequest);

    const mySide: 'A' | 'B' | undefined =
      savedSwapRequest.managerAId === createdById
        ? 'A'
        : savedSwapRequest.managerBId === createdById
          ? 'B'
          : undefined;
    return this.maskSwitcherContactsIfNotPaid(
      savedSwapRequest,
      savedSwapRequest.status === SwapStatusEnum.COMPLETED,
      mySide,
    ) as SwapRequestEntity;
  }

  /**
   * Надсилає системне повідомлення в чат swap-request, якщо чат існує.
   */
  private async sendSwapRequestChatSystemMessage(
    swapRequestId: string,
    text: string,
  ): Promise<void> {
    try {
      const chat = await this.chatService.getSwapRequestChat(swapRequestId);
      if (chat) {
        await this.chatService.sendSystemMessageToChat(chat.id, text);
      }
    } catch (err) {
      console.error(
        'Failed to send swap request chat system message:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Після внесення оплати одним ейчаром: повідомлення в чат + сповіщення та email іншому ейчару.
   * Перезавантажуємо swap request з БД, щоб гарантовано мати актуальні managerAId/managerBId та email.
   */
  private async notifyHrPaymentMade(
    swapRequest: SwapRequestEntity,
    side: 'A' | 'B',
  ): Promise<void> {
    await this.sendSwapRequestChatSystemMessage(
      swapRequest.id,
      `Switcher ${side}'s HR has made the payment`,
    );

    const fresh = await this.swapRequestRepository.findOne({
      where: { id: swapRequest.id },
      select: [
        'id',
        'numericId',
        'managerAId',
        'managerBId',
        'managerAEmail',
        'managerBEmail',
      ],
    });
    if (!fresh) return;

    const otherManagerId = side === 'A' ? fresh.managerBId : fresh.managerAId;
    const otherEmail = side === 'A' ? fresh.managerBEmail : fresh.managerAEmail;

    if (otherManagerId) {
      try {
        await this.notificationService.newNotification({
          type: NotificationTypeEnum.SWAP_HR_PAID,
          userId: otherManagerId,
          data: { swapRequestId: fresh.id, numericId: fresh.numericId },
        });
      } catch (err) {
        console.error(
          `[notifyHrPaymentMade] Failed to send SWAP_HR_PAID notification to ${otherManagerId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    if (otherEmail) {
      try {
        const requestDisplayId =
          fresh.numericId != null
            ? `id${String(fresh.numericId).padStart(5, '0')}`
            : fresh.id.slice(0, 8);
        await this.mailService.sendHrPartnerPaidEmail(
          otherEmail,
          requestDisplayId,
          fresh.id,
        );
      } catch (err) {
        console.error(
          `[notifyHrPaymentMade] Failed to send payment email to ${otherEmail}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  /**
   * Перевіряє чи користувач має роль HR, Admin або Owner в організації swap request.
   * Якщо swap request не прив'язаний до організації - дозволяє всі дії без перевірки ролі.
   * Якщо swap request прив'язаний до організації - перевіряє роль користувача.
   */
  private async checkUserRoleForSwapRequest(
    swapRequest: SwapRequestEntity,
    userId: string,
    side: 'A' | 'B',
  ): Promise<void> {
    const workspaceId =
      side === 'A' ? swapRequest.workspaceAId : swapRequest.workspaceBId;

    // Якщо swap request не прив'язаний до організації - дозволяємо всі дії
    if (!workspaceId) {
      return; // Дозволяємо дії без перевірки ролі
    }

    // Якщо swap request прив'язаний до організації - перевіряємо роль
    try {
      const member = await this.workspaceService.getWorkspaceMember(
        workspaceId,
        userId,
      );

      // Перевіряємо чи роль дозволена (HR, Admin, Owner)
      const allowedRoles = [
        OrganizationRoleEnum.HR,
        OrganizationRoleEnum.ADMIN,
        OrganizationRoleEnum.OWNER,
      ];

      if (!allowedRoles.includes(member.role)) {
        throw new ForbiddenException(
          'You must have HR, Admin, or Owner role to perform this action',
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Якщо користувач не знайдений в організації
      throw new ForbiddenException(
        'You must be a member of an organization (HR, Admin, or Owner) to perform this action',
      );
    }
  }

  /**
   * Синхронізує swap-requests менеджера з його організацією.
   * Викликається коли менеджер створює/приєднується до організації або коли призначається менеджер до swap-request.
   */
  async syncManagerWorkspaces(swapRequest: SwapRequestEntity): Promise<void> {
    // Отримуємо першу організацію менеджера A (якщо він в організації)
    if (swapRequest.managerAId && !swapRequest.workspaceAId) {
      const managerAOrg = await this.getManagerOrganization(
        swapRequest.managerAId,
      );
      if (managerAOrg) {
        swapRequest.workspaceAId = managerAOrg.id;
      }
    }

    // Отримуємо першу організацію менеджера B (якщо він в організації)
    if (swapRequest.managerBId && !swapRequest.workspaceBId) {
      const managerBOrg = await this.getManagerOrganization(
        swapRequest.managerBId,
      );
      if (managerBOrg) {
        swapRequest.workspaceBId = managerBOrg.id;
      }
    }

    await this.swapRequestRepository.save(swapRequest);
  }

  /**
   * Отримує першу організацію менеджера (якщо він учасник хоча б однієї організації).
   * Використовує TypeORM DataSource напряму щоб уникнути циклічної залежності з WorkspaceService.
   */
  private async getManagerOrganization(
    managerId: string,
  ): Promise<{ id: string } | null> {
    const result = await this.swapRequestRepository.manager.query(
      `
      SELECT w.id
      FROM workspace w
      INNER JOIN workspace_member wm ON w.id = wm."workspaceId"
      WHERE wm."userId" = $1 AND w.mode = 'organization'
      ORDER BY wm."createdAt" ASC
      LIMIT 1
    `,
      [managerId],
    );

    return result.length > 0 ? { id: result[0].id } : null;
  }

  /**
   * Синхронізує всі swap-requests менеджера з його новою організацією.
   * Викликається після створення організації або приєднання до неї.
   */
  async syncAllManagerSwapRequests(
    managerId: string,
    organizationId: string,
  ): Promise<void> {
    // Діагностика: перевіряємо скільки записів знайдено
    const countA = await this.swapRequestRepository.count({
      where: { managerAId: managerId },
    });
    const countB = await this.swapRequestRepository.count({
      where: { managerBId: managerId },
    });
    const countANull = await this.swapRequestRepository.count({
      where: { managerAId: managerId, workspaceAId: IsNull() },
    });
    const countBNull = await this.swapRequestRepository.count({
      where: { managerBId: managerId, workspaceBId: IsNull() },
    });

    console.log(`Found ${countA} swap requests with managerAId=${managerId}`);
    console.log(`Found ${countB} swap requests with managerBId=${managerId}`);
    console.log(
      `Found ${countANull} swap requests with managerAId=${managerId} and workspaceAId IS NULL`,
    );
    console.log(
      `Found ${countBNull} swap requests with managerBId=${managerId} and workspaceBId IS NULL`,
    );

    // Оновлюємо всі swap-requests де менеджер A і workspaceAId ще не встановлено
    const res1 = await this.swapRequestRepository.update(
      {
        managerAId: managerId,
        workspaceAId: IsNull(),
      },
      { workspaceAId: organizationId },
    );

    console.log('res1', res1);

    // Оновлюємо всі swap-requests де менеджер B і workspaceBId ще не встановлено
    const res2 = await this.swapRequestRepository.update(
      {
        managerBId: managerId,
        workspaceBId: IsNull(),
      },
      { workspaceBId: organizationId },
    );

    console.log('res2', res2);
  }

  /**
   * Маскує контактні дані світчерів (participant A/B), якщо обидва боки ще не оплатили.
   * Контакти доступні лише при status === COMPLETED (обидва оплатили).
   * @param exposeParticipantSide якщо задано, контакти цієї сторони не маскуються (напр. світчер бачить свої дані після оновлення).
   */
  private maskSwitcherContactsIfNotPaid<T extends Record<string, any>>(
    item: T,
    bothSidesPaid: boolean,
    exposeParticipantSide?: 'A' | 'B',
  ): T {
    if (bothSidesPaid) return item;
    // Reveal on two explicit HR approvals (spec §5 S11) when the flag is on —
    // decoupled from payment. No effect on objects lacking HR-decision fields.
    if (
      FeatureFlags.hrDecisionEnabled &&
      (item as Record<string, unknown>).hrADecision ===
        HrDecisionEnum.APPROVED &&
      (item as Record<string, unknown>).hrBDecision === HrDecisionEnum.APPROVED
    ) {
      return item;
    }
    const result: Record<string, unknown> = { ...item };
    if (exposeParticipantSide !== 'A') {
      result.participantAFullName = null;
      result.participantAPhone = null;
      result.participantAPersonalEmail = null;
    }
    if (exposeParticipantSide !== 'B') {
      result.participantBFullName = null;
      result.participantBPhone = null;
      result.participantBPersonalEmail = null;
    }
    return result as T;
  }

  async findOneOrFail(id: string): Promise<SwapRequestEntity> {
    const swapRequest = await this.swapRequestRepository.findOne({
      where: { id },
      relations: [
        'resumeA',
        'resumeA.jobCore',
        'resumeA.jobType',
        'resumeA.workEnvironment',
        'resumeA.shiftType',
        'resumeA.locationTenure',
        'resumeA.sameRoleCount',
        'resumeA.timeToStartWorking',
        'resumeA.licenseRequired',
        'resumeB',
        'resumeB.jobCore',
        'resumeB.jobType',
        'resumeB.workEnvironment',
        'resumeB.shiftType',
        'resumeB.locationTenure',
        'resumeB.sameRoleCount',
        'resumeB.timeToStartWorking',
        'resumeB.licenseRequired',
        'managerA',
        'managerB',
        'createdBy',
        'cancelledBy',
        'chat',
      ],
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found');
    }

    return swapRequest;
  }

  async findOneWithStatus(
    id: string,
    userId: string,
  ): Promise<
    SwapRequestEntity & {
      step: number;
      tab: SwapRequestStatusType;
      chatId: string | null;
      unreadMessages: number;
    }
  > {
    const swapRequest = await this.findOneOrFail(id);
    const tab = this.determineRequestStatus(swapRequest, userId);
    const unreadMessages = swapRequest.chat
      ? swapRequest.chat.ownerId === userId
        ? swapRequest.chat.ownerUreadMessagesCount
        : swapRequest.chat.participantId === userId
          ? swapRequest.chat.participantUreadMessagesCount
          : 0
      : 0;
    const result = {
      ...swapRequest,
      step: this.determineRequestStep(swapRequest),
      tab,
      chatId: swapRequest.chat?.id ?? null,
      unreadMessages,
    };
    const mySide: 'A' | 'B' | undefined =
      swapRequest.managerAId === userId ||
      swapRequest.resumeA?.userId === userId
        ? 'A'
        : swapRequest.managerBId === userId ||
            swapRequest.resumeB?.userId === userId
          ? 'B'
          : undefined;
    return this.maskSwitcherContactsIfNotPaid(
      result,
      tab === 'success',
      mySide,
    ) as SwapRequestEntity & {
      step: number;
      tab: SwapRequestStatusType;
      chatId: string | null;
      unreadMessages: number;
    };
  }

  private determineRequestStatus(
    swapRequest: SwapRequestEntity,
    userId: string,
  ): SwapRequestStatusType {
    // "failed" - відмінені
    if (
      swapRequest.status === SwapStatusEnum.CANCELLED ||
      swapRequest.status === SwapStatusEnum.REFUNDED
    ) {
      return 'failed';
    }

    // "success" - обидва ейчара оплатили
    if (swapRequest.status === SwapStatusEnum.COMPLETED) {
      return 'success';
    }

    const isCreator = swapRequest.createdById === userId;
    const switcherAId = swapRequest.resumeA?.userId ?? null;
    const switcherBId = swapRequest.resumeB?.userId ?? null;
    const isParticipantA =
      swapRequest.managerAId === userId || switcherAId === userId;
    const isParticipantB =
      swapRequest.managerBId === userId || switcherBId === userId;

    // "new" - ті що відправили тобі (ти не створив, але ти Participant і ще не підтвердив)
    if (!isCreator) {
      if (isParticipantA && !swapRequest.participantAConfirmed) {
        return 'new';
      }
      if (isParticipantB && !swapRequest.participantBConfirmed) {
        return 'new';
      }
    }

    // "active" - ті що ти прийняв, або надіслав сам
    return 'active';
  }

  /** Статуси, що відповідають завершеним або скасованим реквестам (не new/active). */
  private static readonly TAB_TERMINAL_STATUSES: SwapStatusEnum[] = [
    SwapStatusEnum.CANCELLED,
    SwapStatusEnum.REFUNDED,
    SwapStatusEnum.COMPLETED,
  ];

  /**
   * Додає до QueryBuilder умову фільтра по табу (new | active | success | failed).
   * Відповідає логіці determineRequestStatus.
   */
  private applyTabFilter(
    qb: ReturnType<Repository<SwapRequestEntity>['createQueryBuilder']>,
    tab: SwapRequestStatusType,
    userId: string,
  ): void {
    const terminal = SwapRequestService.TAB_TERMINAL_STATUSES;
    if (tab === 'failed') {
      qb.andWhere('swapRequest.status IN (:...terminal)', {
        terminal: [SwapStatusEnum.CANCELLED, SwapStatusEnum.REFUNDED],
      });
      return;
    }
    if (tab === 'success') {
      qb.andWhere('swapRequest.status = :completed', {
        completed: SwapStatusEnum.COMPLETED,
      });
      return;
    }
    if (tab === 'new') {
      qb.andWhere('swapRequest.status NOT IN (:...terminal)', { terminal });
      qb.andWhere(
        `(
          (swapRequest.managerAId = :userId AND (swapRequest.createdById IS NULL OR swapRequest.createdById != :userId) AND swapRequest.participantAConfirmed = false)
          OR (swapRequest.managerBId = :userId AND (swapRequest.createdById IS NULL OR swapRequest.createdById != :userId) AND swapRequest.participantBConfirmed = false)
          OR (resumeA.userId = :userId AND (swapRequest.createdById IS NULL OR swapRequest.createdById != :userId) AND swapRequest.participantAConfirmed = false)
          OR (resumeB.userId = :userId AND (swapRequest.createdById IS NULL OR swapRequest.createdById != :userId) AND swapRequest.participantBConfirmed = false)
        )`,
        { userId },
      );
      return;
    }
    // active
    qb.andWhere('swapRequest.status NOT IN (:...terminal)', { terminal });
    qb.andWhere(
      `(
        swapRequest.createdById = :userId
        OR (swapRequest.managerAId = :userId AND swapRequest.participantAConfirmed = true)
        OR (swapRequest.managerBId = :userId AND swapRequest.participantBConfirmed = true)
        OR (resumeA.userId = :userId AND swapRequest.participantAConfirmed = true)
        OR (resumeB.userId = :userId AND swapRequest.participantBConfirmed = true)
      )`,
      { userId },
    );
  }

  /**
   * Повертає кількість реквестів у кожній вкладці (new, active, success, failed) для користувача.
   */
  async getTabCounts(
    userId: string,
    search?: string,
  ): Promise<{
    new: number;
    active: number;
    success: number;
    failed: number;
    all: number;
  }> {
    const baseParams = { userId };
    const terminal = SwapRequestService.TAB_TERMINAL_STATUSES;

    const baseWhere =
      '(swapRequest.managerAId = :userId OR swapRequest.managerBId = :userId OR swapRequest.createdById = :userId OR resumeA.userId = :userId OR resumeB.userId = :userId)';
    const searchWhere = search
      ? '(swapRequest.id::text ILIKE :search OR swapRequest.participantAPersonalEmail ILIKE :search OR swapRequest.participantBPersonalEmail ILIKE :search OR swapRequest.managerAEmail ILIKE :search OR swapRequest.managerBEmail ILIKE :search)'
      : null;
    const searchParam = search ? { search: `%${search}%` } : {};

    const runCount = async (tab: SwapRequestStatusType): Promise<number> => {
      const qb = this.swapRequestRepository
        .createQueryBuilder('swapRequest')
        .leftJoin('swapRequest.resumeA', 'resumeA')
        .leftJoin('swapRequest.resumeB', 'resumeB')
        .where(baseWhere, baseParams);
      if (searchWhere) qb.andWhere(searchWhere, searchParam);
      this.applyTabFilter(qb, tab, userId);
      return qb.getCount();
    };

    const [newCount, activeCount, successCount, failedCount] =
      await Promise.all([
        runCount('new'),
        runCount('active'),
        runCount('success'),
        runCount('failed'),
      ]);

    return {
      new: newCount,
      active: activeCount,
      success: successCount,
      failed: failedCount,
      all: newCount + activeCount + successCount + failedCount,
    };
  }

  /**
   * Кількість непрочитаних повідомлень у чатах по табах (new, active, success, failed).
   */
  async getUnreadMessagesCountByTab(
    userId: string,
    accountType: UserRoleEnum,
  ): Promise<{
    new: number;
    active: number;
    success: number;
    failed: number;
    all: number;
  }> {
    const chatsWithUnread = await this.chatService.getChatsWithUnreadForUser(
      userId,
      accountType,
    );
    if (chatsWithUnread.length === 0) {
      return { new: 0, active: 0, success: 0, failed: 0, all: 0 };
    }
    const swapRequestIds = [
      ...new Set(chatsWithUnread.map((c) => c.swapRequestId)),
    ];
    const swapRequests = await this.swapRequestRepository.find({
      where: { id: In(swapRequestIds) },
      relations: ['resumeA', 'resumeB'],
    });
    const tabBySwapId = new Map<string, SwapRequestStatusType>();
    for (const sr of swapRequests) {
      tabBySwapId.set(sr.id, this.determineRequestStatus(sr, userId));
    }
    const result = { new: 0, active: 0, success: 0, failed: 0, all: 0 };
    for (const { swapRequestId, unreadCount } of chatsWithUnread) {
      const tab = tabBySwapId.get(swapRequestId);
      if (tab) result[tab] += unreadCount;
      result.all += unreadCount;
    }
    return result;
  }

  /**
   * Список swap-реквестів з фільтром по табу, пагінацією та кількістю по вкладках.
   * tab: new | active | success | failed | all (all або відсутній — без фільтра по табу).
   */
  async findAllByTab(
    userId: string,
    tab: SwapRequestStatusType | 'all',
    filter: IFilterQuery,
    search?: string,
    accountType?: UserRoleEnum,
  ): Promise<
    FilterResponseInterface<
      SwapRequestEntity & {
        tab: SwapRequestStatusType;
        step: number;
        chatId: string | null;
        unreadMessages: number;
      }
    > & {
      tabCounts: {
        new: number;
        active: number;
        success: number;
        failed: number;
        all: number;
      };
      unreadMessagesByTab: {
        new: number;
        active: number;
        success: number;
        failed: number;
        all: number;
      };
    }
  > {
    const page = filter.page ?? 1;
    const perPage =
      filter.per_page ?? Number(process.env.DEFAULT_PAGE_SIZE) ?? 20;

    const qb = this.swapRequestRepository
      .createQueryBuilder('swapRequest')
      .leftJoinAndSelect('swapRequest.resumeA', 'resumeA')
      .leftJoinAndSelect('swapRequest.resumeB', 'resumeB')
      .leftJoinAndSelect('swapRequest.managerA', 'managerA')
      .leftJoinAndSelect('swapRequest.managerB', 'managerB')
      .leftJoinAndSelect('swapRequest.createdBy', 'createdBy')
      .leftJoinAndSelect('swapRequest.cancelledBy', 'cancelledBy')
      .leftJoinAndSelect('swapRequest.chat', 'chat')
      .where(
        '(swapRequest.managerAId = :userId OR swapRequest.managerBId = :userId OR swapRequest.createdById = :userId OR resumeA.userId = :userId OR resumeB.userId = :userId)',
        { userId },
      );

    if (search) {
      qb.andWhere(
        '(swapRequest.id::text ILIKE :search OR swapRequest.participantAPersonalEmail ILIKE :search OR swapRequest.participantBPersonalEmail ILIKE :search OR swapRequest.managerAEmail ILIKE :search OR swapRequest.managerBEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tab !== 'all') {
      this.applyTabFilter(qb, tab, userId);
    }
    qb.orderBy('swapRequest.createdAt', 'DESC');

    const [swapRequests, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    const data = swapRequests.map((request) => {
      const resolvedTab = this.determineRequestStatus(request, userId);
      const unreadMessages = request.chat
        ? request.chat.ownerId === userId
          ? request.chat.ownerUreadMessagesCount
          : request.chat.participantId === userId
            ? request.chat.participantUreadMessagesCount
            : 0
        : 0;

      const item = {
        ...request,
        participantAContactConfirmed: !!(
          request.participantAFullName &&
          request.participantAPhone &&
          request.participantAPersonalEmail
        ),
        participantBContactConfirmed: !!(
          request.participantBFullName &&
          request.participantBPhone &&
          request.participantBPersonalEmail
        ),
        tab: resolvedTab,
        step: this.determineRequestStep(request),
        chatId: request.chat?.id ?? null,
        unreadMessages,
      };
      delete (item as any).chat;
      const mySide: 'A' | 'B' | undefined =
        request.managerAId === userId || request.resumeA?.userId === userId
          ? 'A'
          : request.managerBId === userId || request.resumeB?.userId === userId
            ? 'B'
            : undefined;
      return this.maskSwitcherContactsIfNotPaid(
        item,
        resolvedTab === 'success',
        mySide,
      );
    });

    const tabCounts = await this.getTabCounts(userId, search);
    const unreadMessagesByTab =
      accountType != null
        ? await this.getUnreadMessagesCountByTab(userId, accountType)
        : { new: 0, active: 0, success: 0, failed: 0, all: 0 };

    return {
      data,
      total,
      page,
      perPage,
      pageCount: Math.ceil(total / perPage),
      tabCounts,
      unreadMessagesByTab,
    };
  }

  private determineRequestStep(swapRequest: SwapRequestEntity): number {
    // Завершено - коли ейчари внесли оплати
    if (swapRequest.status === SwapStatusEnum.COMPLETED) {
      return 5; // Завершено - це степ 5
    }

    // Степ 1 - обидва світчери ще не прийняли заявку
    if (
      !swapRequest.participantAConfirmed ||
      !swapRequest.participantBConfirmed
    ) {
      return 1;
    }

    // Перевіряємо чи всі контактні поля заповнені
    const participantAFieldsFilled =
      !!swapRequest.participantAFullName &&
      !!swapRequest.participantAPhone &&
      !!swapRequest.participantAPersonalEmail;

    const participantBFieldsFilled =
      !!swapRequest.participantBFullName &&
      !!swapRequest.participantBPhone &&
      !!swapRequest.participantBPersonalEmail;

    // Степ 2 - обидва світчери прийняли заявки але ще не заповнили контактні поля
    if (!participantAFieldsFilled || !participantBFieldsFilled) {
      return 2;
    }

    // Степ 3 - всі прийняли заявки, поля заповнені і світчери мають запросити свой ейчарів
    // Перевіряємо чи обидва світчери запросили своїх менеджерів (код або email)
    const managerAInvited = !!swapRequest.managerACode;
    const managerBInvited = !!swapRequest.managerBCode;

    if (!managerAInvited || !managerBInvited) {
      return 3;
    }

    // Степ 4 - менеджери приєднуються, підтверджують участь та платять
    // Перевіряємо чи обидва менеджери приєдналися та підтвердили участь
    if (
      swapRequest.managerAJoined &&
      swapRequest.managerBJoined &&
      swapRequest.managerAConfirmed &&
      swapRequest.managerBConfirmed
    ) {
      // Перевіряємо статуси оплати
      const paymentStatuses = [
        SwapStatusEnum.PAYMENT_PENDING,
        SwapStatusEnum.PAYMENT_A_HOLD,
        SwapStatusEnum.PAYMENT_B_HOLD,
        SwapStatusEnum.PAYMENT_BOTH_HOLD,
        SwapStatusEnum.FIRST_PAYMENT_COMPLETED,
      ];
      if (paymentStatuses.includes(swapRequest.status)) {
        return 4; // Степ 4 - оплата
      }
      return 4;
    }

    // Якщо менеджери ще не приєдналися, але вже запрошені - все ще степ 3
    return 3;
  }

  async findAll(
    userId: string,
    filter: IFilterQuery,
    search?: string,
  ): Promise<
    FilterResponseInterface<
      SwapRequestEntity & {
        tab: SwapRequestStatusType;
        step: number;
      }
    >
  > {
    const page = filter.page ?? 1;
    const perPage =
      filter.per_page ?? Number(process.env.DEFAULT_PAGE_SIZE) ?? 20;

    const qb = this.swapRequestRepository
      .createQueryBuilder('swapRequest')
      .leftJoinAndSelect('swapRequest.resumeA', 'resumeA')
      .leftJoinAndSelect('swapRequest.resumeB', 'resumeB')
      .leftJoinAndSelect('swapRequest.managerA', 'managerA')
      .leftJoinAndSelect('swapRequest.managerB', 'managerB')
      .leftJoinAndSelect('swapRequest.createdBy', 'createdBy')
      .leftJoinAndSelect('swapRequest.cancelledBy', 'cancelledBy')
      .where(
        '(swapRequest.managerAId = :userId OR swapRequest.managerBId = :userId OR swapRequest.createdById = :userId OR resumeA.userId = :userId OR resumeB.userId = :userId)',
        { userId },
      );

    if (search) {
      qb.andWhere(
        '(swapRequest.id::text ILIKE :search OR swapRequest.participantAPersonalEmail ILIKE :search OR swapRequest.participantBPersonalEmail ILIKE :search OR swapRequest.managerAEmail ILIKE :search OR swapRequest.managerBEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('swapRequest.createdAt', 'DESC');

    const [swapRequests, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    const data = swapRequests.map((request) => {
      const tab = this.determineRequestStatus(request, userId);
      const item = {
        ...request,
        participantAContactConfirmed: !!(
          request.participantAFullName &&
          request.participantAPhone &&
          request.participantAPersonalEmail
        ),
        participantBContactConfirmed: !!(
          request.participantBFullName &&
          request.participantBPhone &&
          request.participantBPersonalEmail
        ),
        tab,
        step: this.determineRequestStep(request),
      };
      const mySide: 'A' | 'B' | undefined =
        request.managerAId === userId || request.resumeA?.userId === userId
          ? 'A'
          : request.managerBId === userId || request.resumeB?.userId === userId
            ? 'B'
            : undefined;
      return this.maskSwitcherContactsIfNotPaid(
        item,
        tab === 'success',
        mySide,
      );
    });

    return {
      data,
      total,
      page,
      perPage,
      pageCount: Math.ceil(total / perPage),
    };
  }

  /**
   * Кількість swap-реквестів по табах для менеджера (new, active, success, failed).
   * Рахує через ту саму вибірку та determineRequestStatus, що й список — кожен реквест потрапляє лише в один таб, сума = total.
   */
  async getTabCountsForManager(
    userId: string,
    search?: string,
  ): Promise<{ new: number; active: number; success: number; failed: number }> {
    const managerOrg = await this.getManagerOrganization(userId);

    const qb = this.swapRequestRepository
      .createQueryBuilder('swapRequest')
      .leftJoinAndSelect('swapRequest.resumeA', 'resumeA')
      .leftJoinAndSelect('swapRequest.resumeB', 'resumeB');

    if (managerOrg) {
      qb.where(
        '(swapRequest.workspaceAId = :orgId OR swapRequest.workspaceBId = :orgId)',
        { orgId: managerOrg.id },
      );
    } else {
      qb.where(
        '(swapRequest.managerAId = :userId AND swapRequest.workspaceAId IS NULL) OR (swapRequest.managerBId = :userId AND swapRequest.workspaceBId IS NULL)',
        { userId },
      );
    }
    if (search) {
      qb.andWhere(
        '(swapRequest.id::text ILIKE :search OR swapRequest.participantAPersonalEmail ILIKE :search OR swapRequest.participantBPersonalEmail ILIKE :search OR swapRequest.managerAEmail ILIKE :search OR swapRequest.managerBEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const swapRequests = await qb.getMany();
    const counts = { new: 0, active: 0, success: 0, failed: 0 };
    for (const request of swapRequests) {
      const tab = this.determineRequestStatus(request, userId);
      counts[tab] += 1;
    }
    return counts;
  }

  /**
   * Отримати swap-requests для менеджера з фільтрацією по організації:
   * - Якщо менеджер в організації: показувати тільки swap-requests його організації
   * - Якщо менеджер не в організації: показувати тільки swap-requests де він менеджер і workspace ще не встановлено
   * tab: new | active | success | failed — опційно; при передачі повертаються тільки реквести цієї вкладки та tabCounts.
   */
  async findAllForManager(
    userId: string,
    filter: IFilterQuery,
    search?: string,
    tab?: SwapRequestStatusType,
  ): Promise<
    FilterResponseInterface<
      SwapRequestEntity & {
        tab: SwapRequestStatusType;
        step: number;
      }
    > & {
      tabCounts: {
        new: number;
        active: number;
        success: number;
        failed: number;
      };
    }
  > {
    const page = filter.page ?? 1;
    const perPage =
      filter.per_page ?? Number(process.env.DEFAULT_PAGE_SIZE) ?? 20;

    // Отримуємо першу організацію менеджера
    const managerOrg = await this.getManagerOrganization(userId);

    const qb = this.swapRequestRepository
      .createQueryBuilder('swapRequest')
      .leftJoinAndSelect('swapRequest.resumeA', 'resumeA')
      .leftJoinAndSelect('swapRequest.resumeB', 'resumeB')
      .leftJoinAndSelect('swapRequest.managerA', 'managerA')
      .leftJoinAndSelect('swapRequest.managerB', 'managerB')
      .leftJoinAndSelect('swapRequest.createdBy', 'createdBy')
      .leftJoinAndSelect('swapRequest.cancelledBy', 'cancelledBy');

    if (managerOrg) {
      // Менеджер в організації - показуємо тільки swap-requests його організації
      qb.where(
        '(swapRequest.workspaceAId = :orgId OR swapRequest.workspaceBId = :orgId)',
        { orgId: managerOrg.id },
      );
    } else {
      // Менеджер не в організації - показуємо тільки де він менеджер і workspace ще не встановлено
      qb.where(
        '(swapRequest.managerAId = :userId AND swapRequest.workspaceAId IS NULL) OR (swapRequest.managerBId = :userId AND swapRequest.workspaceBId IS NULL)',
        { userId },
      );
    }

    if (search) {
      qb.andWhere(
        '(swapRequest.id::text ILIKE :search OR swapRequest.participantAPersonalEmail ILIKE :search OR swapRequest.participantBPersonalEmail ILIKE :search OR swapRequest.managerAEmail ILIKE :search OR swapRequest.managerBEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tab) {
      this.applyTabFilter(qb, tab, userId);
    }

    qb.orderBy('swapRequest.createdAt', 'DESC');

    const [swapRequests, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    const data = swapRequests.map((request) => {
      const resolvedTab = this.determineRequestStatus(request, userId);
      const item = {
        ...request,
        participantAContactConfirmed: !!(
          request.participantAFullName &&
          request.participantAPhone &&
          request.participantAPersonalEmail
        ),
        participantBContactConfirmed: !!(
          request.participantBFullName &&
          request.participantBPhone &&
          request.participantBPersonalEmail
        ),
        tab: resolvedTab,
        step: this.determineRequestStep(request),
      };
      const mySide: 'A' | 'B' | undefined =
        request.managerAId === userId || request.resumeA?.userId === userId
          ? 'A'
          : request.managerBId === userId || request.resumeB?.userId === userId
            ? 'B'
            : undefined;
      return this.maskSwitcherContactsIfNotPaid(
        item,
        resolvedTab === 'success',
        mySide,
      );
    });

    const tabCounts = await this.getTabCountsForManager(userId, search);

    return {
      data,
      total,
      page,
      perPage,
      pageCount: Math.ceil(total / perPage),
      tabCounts,
    };
  }

  /**
   * Позначає swap як "прочитаний" для HR (встановлює hrARead або hrBRead).
   * HR визначається по відповідності `userId` полю `managerAId`/`managerBId`.
   */
  async markSwapAsRead(id: string, userId: string): Promise<SwapRequestEntity> {
    const swapRequest = await this.findOneOrFail(id);

    const isManagerA = swapRequest.managerAId === userId;
    const isManagerB = swapRequest.managerBId === userId;

    if (!isManagerA && !isManagerB) {
      throw new ForbiddenException(
        'Only manager A or manager B of this swap request can mark it as read',
      );
    }

    if (isManagerA) {
      await this.checkUserRoleForSwapRequest(swapRequest, userId, 'A');
      swapRequest.hrARead = true;
    }

    if (isManagerB) {
      await this.checkUserRoleForSwapRequest(swapRequest, userId, 'B');
      swapRequest.hrBRead = true;
    }

    await this.swapRequestRepository.save(swapRequest);
    return swapRequest;
  }

  /**
   * Підтвердження участі світчером (лише факт згоди участвовати).
   * Світчер — власник резюме (resumeA/userId, resumeB/userId).
   * Контактні дані вводяться окремим етапом через PUT :id/participant-contact.
   * Після підтвердження обох світчерів статус → PARTICIPANTS_CONFIRMED, можна запрошувати HR.
   */
  async confirmParticipant(
    id: string,
    userId: string,
  ): Promise<SwapRequestEntity> {
    const swapRequest = await this.findOneOrFail(id);

    if (swapRequest.status !== SwapStatusEnum.CREATED) {
      throw new BadRequestException(
        'Cannot confirm. Invalid swap request status.',
      );
    }

    const switcherAId = swapRequest.resumeA?.userId ?? null;
    const switcherBId = swapRequest.resumeB?.userId ?? null;

    if (!switcherAId || !switcherBId) {
      throw new BadRequestException(
        'Resumes in this swap request must have owners (switchers).',
      );
    }

    const isSwitcherA = switcherAId === userId;
    const isSwitcherB = switcherBId === userId;

    if (!isSwitcherA && !isSwitcherB) {
      throw new BadRequestException(
        'Only switchers (resume owners) can confirm participation.',
      );
    }

    if (isSwitcherA) {
      swapRequest.participantAConfirmed = true;
    }

    if (isSwitcherB) {
      swapRequest.participantBConfirmed = true;
    }

    if (
      swapRequest.participantAConfirmed &&
      swapRequest.participantBConfirmed
    ) {
      swapRequest.status = SwapStatusEnum.PARTICIPANTS_CONFIRMED;
    }

    const saved = await this.swapRequestRepository.save(swapRequest);

    const label = isSwitcherA ? 'Switcher A' : 'Switcher B';
    await this.sendSwapRequestChatSystemMessage(
      saved.id,
      `${label} confirmed their participation`,
    );

    return this.maskSwitcherContactsIfNotPaid(
      saved,
      saved.status === SwapStatusEnum.COMPLETED,
    ) as SwapRequestEntity;
  }

  /**
   * Оновлення контактних даних світчера на своїй стороні.
   * Може викликати лише власник резюме (світчер) A або B, лише для своїх полів.
   * Дозволено доки swap не завершений і не скасований.
   */
  async updateParticipantContact(
    id: string,
    updateDto: ParticipantConfirmDto,
    userId: string,
  ): Promise<SwapRequestEntity> {
    const swapRequest = await this.findOneOrFail(id);

    const terminalStatuses = [
      SwapStatusEnum.COMPLETED,
      SwapStatusEnum.CANCELLED,
      SwapStatusEnum.REFUNDED,
    ];
    if (terminalStatuses.includes(swapRequest.status)) {
      throw new BadRequestException(
        'Cannot update contact data. Swap request is already completed or cancelled.',
      );
    }

    const switcherAId = swapRequest.resumeA?.userId ?? null;
    const switcherBId = swapRequest.resumeB?.userId ?? null;

    if (!switcherAId || !switcherBId) {
      throw new BadRequestException(
        'Resumes in this swap request must have owners (switchers).',
      );
    }

    const isSwitcherA = switcherAId === userId;
    const isSwitcherB = switcherBId === userId;

    if (!isSwitcherA && !isSwitcherB) {
      throw new BadRequestException(
        'Only the switcher (resume owner) can update their contact data.',
      );
    }

    if (isSwitcherA) {
      swapRequest.participantAFullName = updateDto.fullName;
      swapRequest.participantAPhone = updateDto.phone;
      swapRequest.participantAPersonalEmail = updateDto.personalEmail;
    }

    if (isSwitcherB) {
      swapRequest.participantBFullName = updateDto.fullName;
      swapRequest.participantBPhone = updateDto.phone;
      swapRequest.participantBPersonalEmail = updateDto.personalEmail;
    }

    const saved = await this.swapRequestRepository.save(swapRequest);

    const label = isSwitcherA ? 'Switcher A' : 'Switcher B';
    await this.sendSwapRequestChatSystemMessage(
      saved.id,
      `${label} provided their contact data`,
    );

    const exposeSide = isSwitcherA ? 'A' : 'B';
    return this.maskSwitcherContactsIfNotPaid(
      saved,
      saved.status === SwapStatusEnum.COMPLETED,
      exposeSide,
    ) as SwapRequestEntity;
  }

  private generateHrCode(): string {
    // Генеруємо унікальний 6-значний код
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Запрошення ейчара: або по email (відправляється лист), або тільки по коду (повертається code + joinUrl для шарингу).
   * Email не обов'язковий.
   */
  /** True when BOTH HR managers explicitly approved (spec §5 S10/S11). */
  bothHrApproved(swap: SwapRequestEntity): boolean {
    return (
      swap.hrADecision === HrDecisionEnum.APPROVED &&
      swap.hrBDecision === HrDecisionEnum.APPROVED
    );
  }

  /** Record an HR's explicit decision — only the manager of that side. */
  async recordHrDecision(
    id: string,
    userId: string,
    decision: HrDecisionEnum,
  ) {
    const swap = await this.swapRequestRepository.findOne({
      where: { id },
      relations: ['resumeA', 'resumeB', 'managerA', 'managerB'],
    });
    if (!swap) throw new NotFoundException('Swap request not found');
    const isA = swap.managerAId === userId;
    const isB = swap.managerBId === userId;
    if (!isA && !isB) {
      throw new ForbiddenException("Only this swap's HR managers can decide.");
    }
    const now = new Date();
    if (isA) {
      swap.hrADecision = decision;
      swap.hrADecidedAt = now;
    } else {
      swap.hrBDecision = decision;
      swap.hrBDecidedAt = now;
    }
    await this.swapRequestRepository.save(swap);
    return this.getHrProgress(id, userId);
  }

  /** Worker-facing HR progress for the S10 screen (spec §5 S10). */
  async getHrProgress(id: string, userId: string) {
    const swap = await this.swapRequestRepository.findOne({
      where: { id },
      relations: ['resumeA', 'resumeB'],
    });
    if (!swap) throw new NotFoundException('Swap request not found');
    const isSwitcherA = swap.resumeA?.userId === userId;
    const yourHr = isSwitcherA ? swap.hrADecision : swap.hrBDecision;
    const partnerHr = isSwitcherA ? swap.hrBDecision : swap.hrADecision;
    const declined =
      swap.hrADecision === HrDecisionEnum.DECLINED ||
      swap.hrBDecision === HrDecisionEnum.DECLINED;
    const stage =
      swap.status === SwapStatusEnum.COMPLETED
        ? 'completed'
        : this.bothHrApproved(swap)
          ? 'both_approved'
          : declined
            ? 'closed'
            : 'awaiting_hr';
    return { yourHr, partnerHr, stage };
  }

  async inviteHr(
    id: string,
    inviteDto: HrInviteDto,
    userId: string,
  ): Promise<{
    email?: string;
    code: string;
    side: 'A' | 'B';
    joinUrl: string;
  }> {
    const swapRequest = await this.findOneOrFail(id);

    if (
      swapRequest.status !== SwapStatusEnum.PARTICIPANTS_CONFIRMED &&
      swapRequest.status !== SwapStatusEnum.HR_INVITED &&
      swapRequest.status !== SwapStatusEnum.HR_A_JOINED &&
      swapRequest.status !== SwapStatusEnum.HR_B_JOINED &&
      swapRequest.status !== SwapStatusEnum.HR_BOTH_CONFIRMED &&
      swapRequest.status !== SwapStatusEnum.HR_BOTH_JOINED
    ) {
      throw new BadRequestException(
        'Switchers must be confirmed before inviting HR.',
      );
    }

    // Запрошувати HR для сторони може лише світчер (власник резюме) цієї сторони
    const switcherAId = swapRequest.resumeA?.userId ?? null;
    const switcherBId = swapRequest.resumeB?.userId ?? null;
    const isSideA = switcherAId === userId;
    const isSideB = switcherBId === userId;

    if (!isSideA && !isSideB) {
      throw new BadRequestException(
        'Only switchers (resume owners) can invite HR for their side.',
      );
    }

    const side = isSideA ? 'A' : 'B';

    // Consent gate (spec FR-015/016): when enabled, no employer is contacted until
    // BOTH workers have authorized the current proposal version. Fail-closed.
    if (FeatureFlags.consentGateEnabled) {
      const bothAuthorized = await this.consentService.isBothAuthorized(id);
      if (!bothAuthorized) {
        throw new ForbiddenException(
          'Both workers must authorize before an employer can be contacted.',
        );
      }
    }

    /** Same normalization as user-auth login — DB emails are stored lowercased. */
    const normalizedInviteEmail = inviteDto.email
      ? inviteDto.email.replace(/\s+/g, '').toLowerCase()
      : undefined;

    const throttleKey = `${id}:${side}`;
    if (normalizedInviteEmail) {
      const lastAt = this.lastHrInviteAt.get(throttleKey);
      if (lastAt != null && Date.now() - lastAt < INVITE_HR_THROTTLE_MS) {
        const waitMin = Math.ceil(
          (INVITE_HR_THROTTLE_MS - (Date.now() - lastAt)) / 60000,
        );
        throw new BadRequestException(
          `HR invite can be sent at most once every 10 minutes. Try again in ${waitMin} min.`,
        );
      }
    }

    const baseJoinUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://hr.switcherhub.com';
    let code: string;
    let email: string | null = null;

    let existingHrUser: UserEntity | null = null;

    if (normalizedInviteEmail) {
      existingHrUser = await this.userService.findByEmail(
        normalizedInviteEmail,
      );

      this.logger.log(
        `inviteHr lookup swapRequestId=${id} side=${side} email=${normalizedInviteEmail} foundUser=${!!existingHrUser}` +
          (existingHrUser
            ? ` hrUserId=${existingHrUser.id} activeRole=${existingHrUser.activeRole} isRegistered=${existingHrUser.isRegistered} authVerified=${existingHrUser.credentials?.isVerified ?? false} hasCredentials=${!!existingHrUser.credentials}`
            : ''),
      );

      if (existingHrUser) {
        if (existingHrUser.id === userId) {
          throw new BadRequestException('You cannot invite yourself as an HR.');
        }

        if (existingHrUser.activeRole !== UserRoleEnum.EMPLOYER) {
          throw new BadRequestException(
            'Only employer (HR) accounts can be invited as HR.',
          );
        }
      }
    }

    if (side === 'A') {
      if (normalizedInviteEmail) {
        swapRequest.managerAEmail = normalizedInviteEmail;
        email = normalizedInviteEmail;
      }
      // Завжди генеруємо код (для переходу по посиланню або введення вручну)
      code = this.generateHrCode();
      // Перевіряємо унікальність коду
      let existingRequest = await this.swapRequestRepository.findOne({
        where: { managerACode: code },
      });
      while (existingRequest) {
        code = this.generateHrCode();
        existingRequest = await this.swapRequestRepository.findOne({
          where: { managerACode: code },
        });
      }
      swapRequest.managerACode = code;

      if (swapRequest.status === SwapStatusEnum.PARTICIPANTS_CONFIRMED) {
        swapRequest.status = SwapStatusEnum.HR_INVITED;
      }
    } else {
      if (normalizedInviteEmail) {
        swapRequest.managerBEmail = normalizedInviteEmail;
        email = normalizedInviteEmail;
      }
      // Завжди генеруємо код
      code = this.generateHrCode();
      // Перевіряємо унікальність коду
      let existingRequest = await this.swapRequestRepository.findOne({
        where: { managerBCode: code },
      });
      while (existingRequest) {
        code = this.generateHrCode();
        existingRequest = await this.swapRequestRepository.findOne({
          where: { managerBCode: code },
        });
      }
      swapRequest.managerBCode = code;

      if (swapRequest.status === SwapStatusEnum.PARTICIPANTS_CONFIRMED) {
        swapRequest.status = SwapStatusEnum.HR_INVITED;
      }
    }

    // Якщо HR уже має акаунт (верифікований логін або прапорець isRegistered) — приєднуємо без email.
    // Примітка: isRegistered у БД майже ніде не виставляється; реальний критерій — user_auth.isVerified.
    const hrCanAutoJoin = !!existingHrUser;

    if (hrCanAutoJoin) {
      const hrUser = existingHrUser;
      this.logger.log(
        `inviteHr auto-join swapRequestId=${id} side=${side} hrUserId=${hrUser.id}`,
      );
      if (side === 'A') {
        if (swapRequest.managerAId && swapRequest.managerAId !== hrUser.id) {
          throw new BadRequestException('Manager A must be the same user');
        }
        swapRequest.managerAJoined = true;
        swapRequest.managerAJoinedAt = new Date();
        swapRequest.managerAId = hrUser.id;
        swapRequest.managerA = { id: hrUser.id } as any;

        if (swapRequest.managerBJoined) {
          swapRequest.status = SwapStatusEnum.HR_BOTH_JOINED;
        } else {
          swapRequest.status = SwapStatusEnum.HR_A_JOINED;
        }
      } else {
        if (swapRequest.managerBId && swapRequest.managerBId !== hrUser.id) {
          throw new BadRequestException('Manager B must be the same user');
        }
        swapRequest.managerBJoined = true;
        swapRequest.managerBJoinedAt = new Date();
        swapRequest.managerBId = hrUser.id;
        swapRequest.managerB = { id: hrUser.id } as any;

        if (swapRequest.managerAJoined) {
          swapRequest.status = SwapStatusEnum.HR_BOTH_JOINED;
        } else {
          swapRequest.status = SwapStatusEnum.HR_B_JOINED;
        }
      }

      // Оскільки HR вже приєднався, email-інвайт не надсилаємо.
      email = null;

      // Якщо HR уже в організації — прив'язуємо workspace до сторони свапу (аналогічно joinHrByCode).
      await this.syncManagerWorkspaces(swapRequest);
      const linkedWorkspaceId =
        side === 'A' ? swapRequest.workspaceAId : swapRequest.workspaceBId;
      this.logger.log(
        `inviteHr workspace after auto-join swapRequestId=${id} side=${side} workspaceId=${linkedWorkspaceId ?? 'none'}`,
      );
    } else if (existingHrUser) {
      this.logger.log(
        `inviteHr skip auto-join swapRequestId=${id} side=${side} hrUserId=${existingHrUser.id} isRegistered=${existingHrUser.isRegistered} authVerified=${existingHrUser.credentials?.isVerified ?? false} hasCredentials=${!!existingHrUser.credentials}`,
      );
    }

    await this.swapRequestRepository.save(swapRequest);

    if (normalizedInviteEmail) {
      this.lastHrInviteAt.set(throttleKey, Date.now());
      setTimeout(
        () => this.lastHrInviteAt.delete(throttleKey),
        INVITE_HR_THROTTLE_MS,
      );
    }

    await this.sendSwapRequestChatSystemMessage(
      swapRequest.id,
      `Switcher ${side} invited an HR`,
    );

    // Надсилаємо email з кодом якщо вказано email і HR ще не приєднаний автоматично
    if (email) {
      const joinUrl = `${baseJoinUrl}/swap-request?joinCode=${code}`;
      const emailDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const displayCode =
        code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

      await this.mailService.sendMail(
        email,
        'Your employee has a swap match — 3 min to review',
        `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Your employee has a swap match — 3 min to review</title>
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #F0F2F5; }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span,
    .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding: 20px 16px !important; }
      .code-value { font-size: 28px !important; letter-spacing: 4px !important; }
      .btn-cta { padding: 14px 20px !important; font-size: 14px !important; }
      .hero-title { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F0F2F5;font-family:Arial,Helvetica,sans-serif;">

<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F0F2F5;">
  One of your employees found a swap match. Same role, same pay — review in 3 minutes.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">

      <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">

        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span>
                </td>
                <td align="right">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;">${emailDate}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="mobile-padding" style="background-color:#ffffff;padding:28px 28px 8px;">

            <p class="hero-title" style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Your employee has a swap match.<br/>3 minutes to review.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 12px;">One of your employees found a compatible colleague at another company willing to exchange jobs — same role, same pay, same schedule.</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td style="background-color:#F0FDF4;border-left:3px solid #10B981;border-radius:0 8px 8px 0;padding:12px 14px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0;">
                    <strong style="color:#111111;">Why they want this:</strong> Both employees work closer to home. Less commute — more focus, less burnout, higher retention.
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0FDF4;border:1.5px solid #D1FAE5;border-radius:12px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#10B981;margin:0 0 10px;">How it works</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                    <tr>
                      <td width="14" valign="top" style="padding-top:3px;">
                        <div style="width:6px;height:6px;border-radius:50%;background-color:#10B981;"></div>
                      </td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#111111;padding-left:8px;">Two employees in equivalent roles exchange jobs</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                    <tr>
                      <td width="14" valign="top" style="padding-top:3px;">
                        <div style="width:6px;height:6px;border-radius:50%;background-color:#10B981;"></div>
                      </td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#111111;padding-left:8px;">Same role &middot; Same pay &middot; Same schedule</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="14" valign="top" style="padding-top:3px;">
                        <div style="width:6px;height:6px;border-radius:50%;background-color:#10B981;"></div>
                      </td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#111111;padding-left:8px;">No resignation. No hiring. No disruption.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
              <tr>
                <td align="center">
                  <a href="${joinUrl}" class="btn-cta" style="display:block;background-color:#10B981;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;text-align:center;padding:16px 28px;border-radius:12px;mso-padding-alt:0;mso-text-raise:10pt;">Review Swap Request &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;text-align:center;margin:0 0 20px;">
              <a href="${joinUrl}" style="color:#10B981;text-decoration:none;font-weight:bold;">hr.switcherhub.com</a> &middot; Free to review &middot; No commitment &middot; Request expires in 21 days
            </p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin-bottom:20px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 6px;">Can't find the request?</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;line-height:1.5;margin:0 0 10px;">Sign in and enter this code:</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#111111;letter-spacing:2px;line-height:1;margin:0;">${displayCode}</p>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 12px;">After both companies approve &amp; pay</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
                    <tr>
                      <td width="24" valign="top">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr><td style="width:20px;height:20px;background-color:#10B981;border-radius:50%;text-align:center;vertical-align:middle;">
                            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#ffffff;line-height:20px;">&#10003;</span>
                          </td></tr>
                        </table>
                      </td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.5;padding-left:10px;">Full personal details of both employees are unlocked — names, contacts, and role information.</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
                    <tr>
                      <td width="24" valign="top">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr><td style="width:20px;height:20px;background-color:#10B981;border-radius:50%;text-align:center;vertical-align:middle;">
                            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#ffffff;line-height:20px;">&#10003;</span>
                          </td></tr>
                        </table>
                      </td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.5;padding-left:10px;">You receive the HR contact at the partner company to coordinate all legal and operational details directly.</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="24" valign="top">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr><td style="width:20px;height:20px;background-color:#10B981;border-radius:50%;text-align:center;vertical-align:middle;">
                            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#ffffff;line-height:20px;">&#10003;</span>
                          </td></tr>
                        </table>
                      </td>
                      <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.5;padding-left:10px;">Until then, all identities remain confidential. No data is shared without mutual confirmation.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr><td style="height:1px;background-color:#F3F4F6;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>

            <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 14px;">Why it matters for you</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
              <tr>
                <td width="36" valign="top">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr><td style="width:28px;height:28px;background-color:#F0FDF4;border-radius:8px;text-align:center;vertical-align:middle;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#10B981;line-height:28px;">&#9679;</span>
                    </td></tr>
                  </table>
                </td>
                <td style="padding-left:10px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#111111;margin:0 0 2px;">Retain your employee</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;margin:0;line-height:1.5;">Employees who get location flexibility stay longer. Replacing one costs $3,000–$6,000.</p>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
              <tr>
                <td width="36" valign="top">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr><td style="width:28px;height:28px;background-color:#F0FDF4;border-radius:8px;text-align:center;vertical-align:middle;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#10B981;line-height:28px;">&#9679;</span>
                    </td></tr>
                  </table>
                </td>
                <td style="padding-left:10px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#111111;margin:0 0 2px;">No hiring, no gaps</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;margin:0;line-height:1.5;">A trained replacement arrives at the same time your employee leaves. Operations stay stable.</p>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td width="36" valign="top">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr><td style="width:28px;height:28px;background-color:#F0FDF4;border-radius:8px;text-align:center;vertical-align:middle;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#10B981;line-height:28px;">&#9679;</span>
                    </td></tr>
                  </table>
                </td>
                <td style="padding-left:10px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#111111;margin:0 0 2px;">You stay in control</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;margin:0;line-height:1.5;">You approve or decline. Nothing changes without your confirmation.</p>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td style="background-color:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:10px 14px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#92400E;line-height:1.5;margin:0;">
                    <strong>$149 fee applies only if both companies approve.</strong> Reviewing is completely free. You can decline at no cost.
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
              <tr>
                <td width="20" valign="top" style="padding-top:1px;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#9CA3AF;">&#128274;</span>
                </td>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.5;padding-left:6px;">
                  Employee identities are revealed only after both companies approve. All data is encrypted and securely stored.
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span>
                </td>
                <td align="right">
                  <a href="${joinUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">hr.switcherhub.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`,
      );
    }

    const joinUrl = `${baseJoinUrl}/swap-request?joinCode=${code}`;
    return {
      email: email || undefined,
      code,
      side,
      joinUrl,
    };
  }

  async joinHrByCode(
    joinDto: HrJoinDto,
    userId: string,
  ): Promise<SwapRequestEntity> {
    console.log('[HR Join] Request:', { code: joinDto.code, userId });

    const swapRequest = await this.swapRequestRepository.findOne({
      where: [{ managerACode: joinDto.code }, { managerBCode: joinDto.code }],
      relations: ['resumeA', 'resumeB', 'managerA', 'managerB'],
    });

    if (!swapRequest) {
      console.log('[HR Join] Swap not found for code:', joinDto.code);
      throw new NotFoundException('Invalid code');
    }

    const isManagerA = swapRequest.managerACode === joinDto.code;
    const isManagerB = swapRequest.managerBCode === joinDto.code;

    console.log('[HR Join] Swap found:', {
      swapRequestId: swapRequest.id,
      managerACode: swapRequest.managerACode,
      managerBCode: swapRequest.managerBCode,
      managerAId: swapRequest.managerAId,
      managerBId: swapRequest.managerBId,
      managerAJoined: swapRequest.managerAJoined,
      managerBJoined: swapRequest.managerBJoined,
      isManagerA,
      isManagerB,
    });

    if (isManagerA && swapRequest.managerAJoined) {
      throw new BadRequestException('Manager A already joined');
    }

    if (isManagerB && swapRequest.managerBJoined) {
      throw new BadRequestException('Manager B already joined');
    }

    const normalizeJoinEmail = (e: string | null | undefined) =>
      (e ?? '').trim().toLowerCase();

    // Якщо для цієї сторони вказано email запрошеного HR — лише цей email може приєднатись по коду
    const expectedHrEmail = isManagerA
      ? normalizeJoinEmail(swapRequest.managerAEmail)
      : isManagerB
        ? normalizeJoinEmail(swapRequest.managerBEmail)
        : '';

    if (expectedHrEmail) {
      const joinUser = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email'],
      });
      const actualEmail = normalizeJoinEmail(joinUser?.email);
      if (!joinUser || actualEmail !== expectedHrEmail) {
        throw new ForbiddenException(
          'This invite code is linked to a different HR email',
        );
      }
    }

    if (isManagerA) {
      // Перевірка: якщо менеджер A вже встановлений, повинен бути тим самим користувачем
      if (swapRequest.managerAId && swapRequest.managerAId !== userId) {
        throw new BadRequestException('Manager A must be the same user');
      }
      swapRequest.managerAJoined = true;
      swapRequest.managerAJoinedAt = new Date();
      swapRequest.managerAId = userId;
      swapRequest.managerA = { id: userId } as any;

      if (swapRequest.managerBJoined) {
        swapRequest.status = SwapStatusEnum.HR_BOTH_JOINED;
      } else {
        swapRequest.status = SwapStatusEnum.HR_A_JOINED;
      }
    }

    if (isManagerB) {
      // Перевірка: якщо менеджер B вже встановлений, повинен бути тим самим користувачем
      if (swapRequest.managerBId && swapRequest.managerBId !== userId) {
        throw new BadRequestException('Manager B must be the same user');
      }
      swapRequest.managerBJoined = true;
      swapRequest.managerBJoinedAt = new Date();
      swapRequest.managerBId = userId;
      swapRequest.managerB = { id: userId } as any;

      if (swapRequest.managerAJoined) {
        swapRequest.status = SwapStatusEnum.HR_BOTH_JOINED;
      } else {
        swapRequest.status = SwapStatusEnum.HR_B_JOINED;
      }
    }

    const saved = await this.swapRequestRepository.save(swapRequest);

    const hrSide = isManagerA ? 'A' : 'B';
    await this.sendSwapRequestChatSystemMessage(
      saved.id,
      `HR of Switcher ${hrSide} joined`,
    );

    // // Якщо інший ейчар вже приєднаний — надсилаємо йому сповіщення та email
    // if (isManagerA && saved.managerBJoined && saved.managerBId) {
    //   await this.notificationService.newNotification({
    //     type: NotificationTypeEnum.SWAP_HR_JOINED,
    //     userId: saved.managerBId,
    //     data: { swapRequestId: saved.id },
    //   });
    //   if (saved.managerBEmail) {
    //     await this.mailService.sendMail(
    //       saved.managerBEmail,
    //       'HR of Switcher A joined the swap',
    //       'Please review the details in the attachment.',
    //     );
    //   }
    // }

    // if (isManagerB && saved.managerAJoined && saved.managerAId) {
    //   await this.notificationService.newNotification({
    //     type: NotificationTypeEnum.SWAP_HR_JOINED,
    //     userId: saved.managerAId,
    //     data: { swapRequestId: saved.id },
    //   });
    //   if (saved.managerAEmail) {
    //     await this.mailService.sendMail(
    //       saved.managerAEmail,
    //       'HR of Switcher B joined the swap',
    //       'Please review the details in the attachment.',
    //     );
    //   }
    // }

    console.log('[HR Join] After save:', {
      swapRequestId: saved.id,
      managerAId: saved.managerAId,
      managerBId: saved.managerBId,
      status: saved.status,
    });

    // Синхронізуємо організації менеджерів з swap request
    await this.syncManagerWorkspaces(saved);

    // Перезавантажуємо swap request щоб отримати оновлені дані з організаціями
    const updatedSwapRequest = await this.swapRequestRepository.findOne({
      where: { id: saved.id },
      relations: [
        'resumeA',
        'resumeB',
        'managerA',
        'managerB',
        'workspaceA',
        'workspaceB',
      ],
    });

    // Перевіряємо роль користувача після приєднання (HR, Admin, або Owner)
    // Використовуємо оновлений swap request з організаціями
    const finalSwapRequest = updatedSwapRequest || saved;
    const side = isManagerA ? 'A' : 'B';
    await this.checkUserRoleForSwapRequest(finalSwapRequest, userId, side);

    // Після приєднання обох HR статус лишається HR_BOTH_JOINED.
    // Перехід до PAYMENT_PENDING відбувається після підтвердження участі обома менеджерами (confirmManagerParticipation).

    return finalSwapRequest;
  }

  /**
   * Менеджер підтверджує участь (галочка "підтверджую участь") після приєднання.
   * Коли обидва менеджери підтвердять — створюється чат і статус змінюється на PAYMENT_PENDING.
   */
  async confirmManagerParticipation(id: string, userId: string) {
    const swapRequest = await this.swapRequestRepository.findOne({
      where: { id },
      relations: [
        'resumeA',
        'resumeB',
        'managerA',
        'managerB',
        'workspaceA',
        'workspaceB',
      ],
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found');
    }

    const allowedStatuses = [
      SwapStatusEnum.HR_BOTH_JOINED,
      SwapStatusEnum.HR_A_CONFIRMED,
      SwapStatusEnum.HR_B_CONFIRMED,
    ];
    if (!allowedStatuses.includes(swapRequest.status)) {
      throw new BadRequestException(
        'Participation can only be confirmed when both managers have joined',
      );
    }

    const isManagerA = swapRequest.managerAId === userId;
    const isManagerB = swapRequest.managerBId === userId;

    if (!isManagerA && !isManagerB) {
      throw new BadRequestException(
        'Only a manager of this swap request can confirm participation',
      );
    }

    // Перевіряємо роль користувача (HR, Admin, або Owner)
    const side = isManagerA ? 'A' : 'B';
    await this.checkUserRoleForSwapRequest(swapRequest, userId, side);

    if (isManagerA) {
      if (swapRequest.managerAConfirmed) {
        throw new BadRequestException(
          'Manager A has already confirmed participation',
        );
      }
      swapRequest.managerAConfirmed = true;
      swapRequest.managerAConfirmedAt = new Date();
      swapRequest.status = swapRequest.managerBConfirmed
        ? SwapStatusEnum.HR_BOTH_CONFIRMED
        : SwapStatusEnum.HR_A_CONFIRMED;
    }

    if (isManagerB) {
      if (swapRequest.managerBConfirmed) {
        throw new BadRequestException(
          'Manager B has already confirmed participation',
        );
      }
      swapRequest.managerBConfirmed = true;
      swapRequest.managerBConfirmedAt = new Date();
      swapRequest.status = swapRequest.managerAConfirmed
        ? SwapStatusEnum.HR_BOTH_CONFIRMED
        : SwapStatusEnum.HR_B_CONFIRMED;
    }

    const saved = await this.swapRequestRepository.save(swapRequest);

    // Сповіщення та email менеджеру-опоненту про підтвердження участі
    const opponentManagerId = isManagerA ? saved.managerBId : saved.managerAId;
    const opponentEmail = isManagerA
      ? saved.managerBEmail
      : saved.managerAEmail;
    if (opponentManagerId) {
      await this.notificationService.newNotification({
        type: NotificationTypeEnum.SWAP_HR_CONFIRMED,
        userId: opponentManagerId,
        data: { swapRequestId: saved.id, numericId: saved.numericId },
      });
    }

    // if (opponentEmail) {
    //   await this.mailService.sendMail(
    //     opponentEmail,
    //     'Another HR confirmed their participation',
    //     'Next step: please review the details in the attachment.',
    //   );
    // }

    // Коли обидва менеджери підтвердили участь — ставимо HR_BOTH_CONFIRMED і переходимо до оплати
    if (saved.managerAConfirmed && saved.managerBConfirmed) {
      saved.status = SwapStatusEnum.PAYMENT_PENDING;
      await this.swapRequestRepository.save(saved);
    }

    return this.swapRequestRepository.findOne({
      where: { id: saved.id },
      relations: [
        'resumeA',
        'resumeB',
        'managerA',
        'managerB',
        'workspaceA',
        'workspaceB',
      ],
    });
  }

  async createPaymentIntent(
    id: string,
    userId: string,
    dto?: PaymentIntentCreateDto,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    requiresPaymentMethod: boolean;
    status: string;
  }> {
    if (!this.stripe) {
      this.logger.error(
        '[PaymentIntent] blocked: Stripe client missing — set STRIPE_SECRET_KEY and restart',
      );
      throw new BadRequestException('Stripe is not configured');
    }

    this.logger.log(
      `[PaymentIntent] start swapRequestId=${id} userId=${userId} bodyPaymentMethodId=${dto?.paymentMethodId ?? 'none'} stripeKeyMode=${this.stripeSecretMode}`,
    );

    const swapRequest = await this.swapRequestRepository.findOne({
      where: { id },
      relations: ['workspaceA', 'workspaceB'],
    });

    if (!swapRequest) {
      this.logger.warn(`[PaymentIntent] swap request not found id=${id}`);
      throw new NotFoundException('Swap request not found');
    }

    // Оплату дозволено відразу після призначення менеджера (не чекаємо приєднання/підтвердження другого).

    // Визначаємо сторону на основі userId
    const isSideA = swapRequest.managerAId === userId;
    const isSideB = swapRequest.managerBId === userId;

    if (!isSideA && !isSideB) {
      this.logger.warn(
        `[PaymentIntent] user ${userId} is not manager A/B for swap ${id} (managerAId=${swapRequest.managerAId} managerBId=${swapRequest.managerBId})`,
      );
      throw new BadRequestException(
        'You are not authorized to create payment for this swap request.',
      );
    }

    const side = isSideA ? 'A' : 'B';

    // Перевіряємо роль користувача (HR, Admin, або Owner)
    await this.checkUserRoleForSwapRequest(swapRequest, userId, side);
    // $149.00 per employer (matches the user-facing fee); override via SWAP_PAYMENT_AMOUNT (cents).
    const amount =
      Number(this.configService.get('SWAP_PAYMENT_AMOUNT', 14900)) || 14900; // cents

    let paymentIntentId: string;
    let clientSecret: string;

    const storedPiId =
      side === 'A'
        ? swapRequest.stripePaymentIntentIdA
        : swapRequest.stripePaymentIntentIdB;

    if (storedPiId) {
      this.logger.log(
        `[PaymentIntent] found stored PI for side ${side}: ${storedPiId} (mode=${this.stripeSecretMode})`,
      );
      try {
        const paymentIntent =
          await this.stripe.paymentIntents.retrieve(storedPiId);
        this.logger.log(
          `[PaymentIntent] retrieved PI ${paymentIntent.id} status=${paymentIntent.status}`,
        );
        if (this.canReuseRetrievedPaymentIntent(paymentIntent)) {
          return {
            clientSecret: paymentIntent.client_secret as string,
            paymentIntentId: paymentIntent.id,
            requiresPaymentMethod:
              paymentIntent.status === 'requires_payment_method' ||
              paymentIntent.status === 'requires_confirmation',
            status: paymentIntent.status,
          };
        }
        this.logger.warn(
          `[PaymentIntent] stored PI ${storedPiId} is not reusable (status=${paymentIntent.status}); clearing DB reference and creating a new PaymentIntent`,
        );
        await this.clearStaleStoredPaymentIntentForSide(swapRequest, side);
      } catch (err) {
        const missing =
          err instanceof Stripe.errors.StripeInvalidRequestError &&
          err.code === 'resource_missing';
        if (missing) {
          this.logger.warn(
            `[PaymentIntent] stored PI ${storedPiId} not found in Stripe; clearing side ${side} and creating new`,
          );
          await this.clearStaleStoredPaymentIntentForSide(swapRequest, side);
        } else {
          this.logStripeError(`retrieve stored PI ${storedPiId}`, err);
          throw err;
        }
      }
    }

    // Визначаємо workspace для цієї сторони
    const workspaceId =
      side === 'A' ? swapRequest.workspaceAId : swapRequest.workspaceBId;
    let stripePaymentMethodId: string | null = null;
    let stripeCustomerId: string | null = null;

    // Якщо менеджер в організації і передано paymentMethodId - використовуємо його
    if (workspaceId && dto?.paymentMethodId) {
      const paymentMethods =
        await this.workspacePaymentMethodService.getPaymentMethods(workspaceId);
      const paymentMethod = paymentMethods.find(
        (pm) => pm.id === dto.paymentMethodId,
      );

      if (!paymentMethod) {
        throw new BadRequestException(
          'Payment method not found in organization',
        );
      }

      stripePaymentMethodId = paymentMethod.stripePaymentMethodId;
      stripeCustomerId = paymentMethod.stripeCustomerId;
    }

    // Створюємо payment intent з hold (capture_method: 'manual')
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'usd',
      capture_method: 'manual', // Завжди використовуємо hold
      payment_method_types: ['card'], // Використовуємо тільки картки, без редиректів
      metadata: {
        swapRequestId: id,
        side,
      },
    };

    // Якщо є payment method з організації - використовуємо його
    if (stripePaymentMethodId && stripeCustomerId) {
      paymentIntentParams.payment_method = stripePaymentMethodId;
      paymentIntentParams.customer = stripeCustomerId;
      paymentIntentParams.confirmation_method = 'automatic';
      paymentIntentParams.confirm = true; // Автоматично підтверджуємо якщо використовуємо payment method
      // Явно вказуємо capture_method в payment_method_options для карток
      paymentIntentParams.payment_method_options = {
        card: {
          capture_method: 'manual',
        },
      };
    }

    this.logger.log(
      `[PaymentIntent] calling Stripe paymentIntents.create swap=${id} side=${side} amountCents=${amount} confirm=${!!paymentIntentParams.confirm} workspaceId=${workspaceId ?? 'none'}`,
    );

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentParams);
    } catch (err) {
      this.logStripeError('paymentIntents.create', err);
      if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        if (err.code === 'resource_missing') {
          const msg = err.message ?? '';
          if (
            stripePaymentMethodId &&
            (err.param === 'payment_method' || msg.includes('PaymentMethod'))
          ) {
            throw new BadRequestException(
              'This workspace payment method is no longer valid in Stripe. Remove it and add a new card in payment settings, or pay without selecting a saved card.',
            );
          }
          if (
            stripeCustomerId &&
            (err.param === 'customer' || msg.includes('No such customer'))
          ) {
            throw new BadRequestException(
              'The workspace billing customer is missing in Stripe. Re-add payment methods for this workspace or contact support.',
            );
          }
        }
      }
      throw err;
    }

    paymentIntentId = paymentIntent.id;
    clientSecret = paymentIntent.client_secret as string;

    // Перевіряємо статус payment intent після створення
    // Якщо використовується payment method з confirm: true, payment intent може бути одразу підтверджений
    // З capture_method: 'manual' він повинен бути в стані 'requires_capture' або 'succeeded' з amount_capturable > 0
    const isHold = paymentIntent.amount_capturable > 0;
    const isRequiresCapture = paymentIntent.status === 'requires_capture';
    const isSucceeded = paymentIntent.status === 'succeeded';

    this.logger.log(
      `[PaymentIntent] created PI ${paymentIntentId} swap=${id} side=${side} status=${paymentIntent.status} amount=${paymentIntent.amount} amount_capturable=${paymentIntent.amount_capturable} capture_method=${paymentIntent.capture_method} isHold=${isHold} usedOrgPaymentMethod=${!!stripePaymentMethodId}`,
    );

    // Якщо payment intent вже підтверджений (через confirm: true), обробляємо hold одразу
    if ((isRequiresCapture || isSucceeded) && isHold) {
      this.logger.log(
        `[PaymentIntent] hold path: updating swap status for side ${side} (both sides may trigger capture)`,
      );
      // Це hold - оновлюємо статус відповідної сторони та сповіщаємо ейчара-опонента (сповіщення + email)
      if (side === 'A') {
        swapRequest.paymentAHold = true;
        swapRequest.paymentAHoldAt = new Date();
        swapRequest.stripePaymentIntentIdA = paymentIntentId;

        if (swapRequest.paymentBHold) {
          // Обидва зробили hold - захоплюємо обидва платежі
          swapRequest.status = SwapStatusEnum.PAYMENT_BOTH_HOLD;
          await this.swapRequestRepository.save(swapRequest);
          await this.notifyHrPaymentMade(swapRequest, 'A'); // сповіщення + email менеджеру B
          await this.captureBothPayments(swapRequest);
        } else {
          // Тільки A зробив hold
          swapRequest.status = SwapStatusEnum.PAYMENT_A_HOLD;
          await this.swapRequestRepository.save(swapRequest);
          await this.notifyHrPaymentMade(swapRequest, 'A'); // сповіщення + email менеджеру B
        }
      } else {
        swapRequest.paymentBHold = true;
        swapRequest.paymentBHoldAt = new Date();
        swapRequest.stripePaymentIntentIdB = paymentIntentId;

        if (swapRequest.paymentAHold) {
          // Обидва зробили hold - захоплюємо обидва платежі
          swapRequest.status = SwapStatusEnum.PAYMENT_BOTH_HOLD;
          await this.swapRequestRepository.save(swapRequest);
          await this.notifyHrPaymentMade(swapRequest, 'B'); // сповіщення + email менеджеру A
          await this.captureBothPayments(swapRequest);
        } else {
          // Тільки B зробив hold
          swapRequest.status = SwapStatusEnum.PAYMENT_B_HOLD;
          await this.swapRequestRepository.save(swapRequest);
          await this.notifyHrPaymentMade(swapRequest, 'B'); // сповіщення + email менеджеру A
        }
      }
    } else if (isSucceeded && !isHold) {
      // Помилка: payment intent вже захоплений, але не повинен бути
      console.error(
        `Payment intent ${paymentIntentId} is already captured but should be on hold. This should not happen with capture_method: 'manual'.`,
      );
      throw new BadRequestException(
        'Payment intent was already captured. This should not happen.',
      );
    } else {
      // Payment intent потребує підтвердження (requires_payment_method або requires_confirmation)
      // Зберігаємо payment intent ID - frontend використає clientSecret для підтвердження
      // Webhook обробить підтвердження коли користувач введе дані картки
      this.logger.log(
        `[PaymentIntent] PI ${paymentIntentId} needs client-side confirmation (status=${paymentIntent.status}). Saved id on swap; Stripe.js + webhook should complete hold. Search Stripe for ${paymentIntentId} (mode=${this.stripeSecretMode}).`,
      );
      if (side === 'A') {
        swapRequest.stripePaymentIntentIdA = paymentIntentId;
      } else {
        swapRequest.stripePaymentIntentIdB = paymentIntentId;
      }
      await this.swapRequestRepository.save(swapRequest);
    }

    // Повертаємо clientSecret та paymentIntentId
    // Якщо payment method не передано - frontend повинен використовувати clientSecret з Stripe.js для підтвердження
    // Якщо payment method передано - payment intent вже підтверджений і в стані hold
    this.logger.log(
      `[PaymentIntent] response swap=${id} paymentIntentId=${paymentIntentId} status=${paymentIntent.status} requiresPaymentMethod=${!stripePaymentMethodId} (clientSecret omitted from logs)`,
    );
    return {
      clientSecret,
      paymentIntentId,
      requiresPaymentMethod: !stripePaymentMethodId, // Чи потрібно ввести дані картки на frontend
      status: paymentIntent.status, // Статус payment intent для діагностики
    };
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    console.log(`[Webhook] Received event: ${event.type}`);

    // Обробляємо payment_intent.succeeded та payment_intent.amount_capturable_updated
    // amount_capturable_updated надходить коли payment intent переходить в стан requires_capture
    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.amount_capturable_updated'
    ) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const swapRequestId = paymentIntent.metadata?.swapRequestId;
      const side = paymentIntent.metadata?.side;

      console.log(`[Webhook] Payment intent metadata:`, {
        swapRequestId,
        side,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount_capturable: paymentIntent.amount_capturable,
      });

      if (!swapRequestId || !side) {
        console.error('Missing metadata in payment intent:', {
          swapRequestId,
          side,
          metadata: paymentIntent.metadata,
        });
        return;
      }

      const swapRequest = await this.findOneOrFail(swapRequestId);

      // Перевіряємо чи payment intent ID відповідає метаданим (якщо вже збережено)
      const expectedPaymentIntentId =
        side === 'A'
          ? swapRequest.stripePaymentIntentIdA
          : swapRequest.stripePaymentIntentIdB;

      // Якщо payment intent ID ще не збережено - зберігаємо його
      if (!expectedPaymentIntentId) {
        if (side === 'A') {
          swapRequest.stripePaymentIntentIdA = paymentIntent.id;
        } else {
          swapRequest.stripePaymentIntentIdB = paymentIntent.id;
        }
        await this.swapRequestRepository.save(swapRequest);
      } else if (expectedPaymentIntentId !== paymentIntent.id) {
        console.error(
          `Payment intent ID mismatch for swap request ${swapRequestId}. Expected: ${expectedPaymentIntentId}, Got: ${paymentIntent.id}`,
        );
        return;
      }

      // Перевіряємо чи це hold (amount_capturable > 0 означає що кошти зарезервовані але не захоплені)
      const isHold = paymentIntent.amount_capturable > 0;

      console.log(
        `[Webhook] Payment intent ${paymentIntent.id} for swap request ${swapRequestId}, side ${side}:`,
        {
          status: paymentIntent.status,
          amount_capturable: paymentIntent.amount_capturable,
          amount: paymentIntent.amount,
          isHold,
          paymentAHold: swapRequest.paymentAHold,
          paymentBHold: swapRequest.paymentBHold,
          stripePaymentIntentIdA: swapRequest.stripePaymentIntentIdA,
          stripePaymentIntentIdB: swapRequest.stripePaymentIntentIdB,
        },
      );

      if (isHold) {
        // Це hold - оновлюємо статус відповідної сторони
        if (side === 'A') {
          swapRequest.paymentAHold = true;
          swapRequest.paymentAHoldAt = new Date();

          if (swapRequest.paymentBHold) {
            swapRequest.status = SwapStatusEnum.PAYMENT_BOTH_HOLD;
            await this.swapRequestRepository.save(swapRequest);
            await this.notifyHrPaymentMade(swapRequest, 'A');
            await this.captureBothPayments(swapRequest);
          } else {
            swapRequest.status = SwapStatusEnum.PAYMENT_A_HOLD;
            await this.swapRequestRepository.save(swapRequest);
            await this.notifyHrPaymentMade(swapRequest, 'A');
          }
        } else if (side === 'B') {
          swapRequest.paymentBHold = true;
          swapRequest.paymentBHoldAt = new Date();

          if (swapRequest.paymentAHold) {
            swapRequest.status = SwapStatusEnum.PAYMENT_BOTH_HOLD;
            await this.swapRequestRepository.save(swapRequest);
            await this.notifyHrPaymentMade(swapRequest, 'B');
            await this.captureBothPayments(swapRequest);
          } else {
            swapRequest.status = SwapStatusEnum.PAYMENT_B_HOLD;
            await this.swapRequestRepository.save(swapRequest);
            await this.notifyHrPaymentMade(swapRequest, 'B');
          }
        }
      } else {
        // Це не hold - можливо автоматичний capture (не повинно статися з нашою логікою)
        console.warn(
          `Payment intent ${paymentIntent.id} succeeded but is not a hold. Status: ${paymentIntent.status}, amount_capturable: ${paymentIntent.amount_capturable}`,
        );
        // Не встановлюємо статус COMPLETED, якщо це не hold
        // Це може бути помилка в конфігурації Stripe або payment intent вже був захоплений
      }
    }
  }

  private async captureBothPayments(
    swapRequest: SwapRequestEntity,
  ): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    // Захоплюємо обидва платежі
    const captureResults: Array<{ success: boolean; error?: any }> = [];

    if (swapRequest.stripePaymentIntentIdA) {
      try {
        await this.stripe.paymentIntents.capture(
          swapRequest.stripePaymentIntentIdA,
        );
        captureResults.push({ success: true });
        console.log(
          `Successfully captured payment intent A: ${swapRequest.stripePaymentIntentIdA}`,
        );
      } catch (error) {
        console.error(
          `Failed to capture payment intent A ${swapRequest.stripePaymentIntentIdA}:`,
          error,
        );
        captureResults.push({ success: false, error });
      }
    }

    if (swapRequest.stripePaymentIntentIdB) {
      try {
        await this.stripe.paymentIntents.capture(
          swapRequest.stripePaymentIntentIdB,
        );
        captureResults.push({ success: true });
        console.log(
          `Successfully captured payment intent B: ${swapRequest.stripePaymentIntentIdB}`,
        );
      } catch (error) {
        console.error(
          `Failed to capture payment intent B ${swapRequest.stripePaymentIntentIdB}:`,
          error,
        );
        captureResults.push({ success: false, error });
      }
    }

    // Перевіряємо чи всі capture успішні
    const allSuccessful = captureResults.every((result) => result.success);

    if (!allSuccessful) {
      // Якщо хоча б один capture не спрацював - залишаємо статус PAYMENT_BOTH_HOLD
      // Адміністратор може вручну захопити платежі через Stripe Dashboard
      console.error(
        `Failed to capture one or more payments for swap request ${swapRequest.id}. Status remains PAYMENT_BOTH_HOLD.`,
      );
      // Не змінюємо статус - залишаємо PAYMENT_BOTH_HOLD
      // Можна додати поле для відстеження помилок capture
      return;
    }

    // Всі capture успішні - завершуємо свап
    swapRequest.status = SwapStatusEnum.COMPLETED;
    swapRequest.completedAt = new Date();
    await this.swapRequestRepository.save(swapRequest);
    // await Promise.all([
    //   this.resumeService.update(swapRequest.resumeAId, { isActive: false }),
    //   this.resumeService.update(swapRequest.resumeBId, { isActive: false }),
    // ]);

    await this.sendSwapRequestChatSystemMessage(
      swapRequest.id,
      'Deal completed',
    );

    // Перезавантажуємо swap, щоб мати актуальні managerAId/managerBId для сповіщень
    const freshForNotifications = await this.swapRequestRepository.findOne({
      where: { id: swapRequest.id },
      select: ['id', 'managerAId', 'managerBId'],
    });
    if (freshForNotifications?.managerAId) {
      try {
        await this.notificationService.newNotification({
          type: NotificationTypeEnum.SWAP_DEAL_COMPLETED,
          userId: freshForNotifications.managerAId,
          data: {
            swapRequestId: freshForNotifications.id,
            numericId: freshForNotifications.numericId,
          },
        });
      } catch (err) {
        console.error(
          `[captureBothPayments] Failed to send SWAP_DEAL_COMPLETED to managerA ${freshForNotifications.managerAId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    if (freshForNotifications?.managerBId) {
      try {
        await this.notificationService.newNotification({
          type: NotificationTypeEnum.SWAP_DEAL_COMPLETED,
          userId: freshForNotifications.managerBId,
          data: {
            swapRequestId: freshForNotifications.id,
            numericId: freshForNotifications.numericId,
          },
        });
      } catch (err) {
        console.error(
          `[captureBothPayments] Failed to send SWAP_DEAL_COMPLETED to managerB ${freshForNotifications.managerBId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Лист «Swap activated» обом HR
    const requestDisplayId =
      swapRequest.numericId != null
        ? `id${String(swapRequest.numericId).padStart(5, '0')}`
        : swapRequest.id.slice(0, 8);
    if (swapRequest.managerAEmail) {
      try {
        await this.mailService.sendHrSwapActivatedEmail(
          swapRequest.managerAEmail,
          requestDisplayId,
          swapRequest.id,
        );
      } catch (err) {
        console.error(
          `[captureBothPayments] Failed to send Swap activated email to managerA ${swapRequest.managerAEmail}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    if (swapRequest.managerBEmail) {
      try {
        await this.mailService.sendHrSwapActivatedEmail(
          swapRequest.managerBEmail,
          requestDisplayId,
          swapRequest.id,
        );
      } catch (err) {
        console.error(
          `[captureBothPayments] Failed to send Swap activated email to managerB ${swapRequest.managerBEmail}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Надсилаємо персональні дані обом HR (email листи)
    // await this.sendPersonalDataToHrs(swapRequest);
  }

  private async sendPersonalDataToHrs(
    swapRequest: SwapRequestEntity,
  ): Promise<void> {
    // Надсилаємо дані менеджеру A
    if (swapRequest.managerAEmail) {
      await this.mailService.sendMail(
        swapRequest.managerAEmail,
        'Resume Swap Completed - Personal Data',
        `
        <html>
          <body>
            <h2>Resume Swap Completed</h2>
            <p>Here are the personal details for Resume B:</p>
            <p><strong>Name:</strong> ${swapRequest.participantBFullName}</p>
            <p><strong>Phone:</strong> ${swapRequest.participantBPhone}</p>
            <p><strong>Email:</strong> ${swapRequest.participantBPersonalEmail}</p>
          </body>
        </html>
      `,
      );
    }

    // Надсилаємо дані менеджеру B
    if (swapRequest.managerBEmail) {
      await this.mailService.sendMail(
        swapRequest.managerBEmail,
        'Resume Swap Completed - Personal Data',
        `
        <html>
          <body>
            <h2>Resume Swap Completed</h2>
            <p>Here are the personal details for Resume A:</p>
            <p><strong>Name:</strong> ${swapRequest.participantAFullName}</p>
            <p><strong>Phone:</strong> ${swapRequest.participantAPhone}</p>
            <p><strong>Email:</strong> ${swapRequest.participantAPersonalEmail}</p>
          </body>
        </html>
      `,
      );
    }
  }

  /**
   * Скасування реквеста від імені світчера (власника резюме).
   * Дозволено лише доки світчер ще не запросив ейчара (для своєї сторони немає managerACode / managerBCode).
   */
  async cancelBySwitcher(
    id: string,
    userId: string,
  ): Promise<SwapRequestEntity> {
    const swapRequest = await this.findOneOrFail(id);

    if (
      swapRequest.status === SwapStatusEnum.CANCELLED ||
      swapRequest.status === SwapStatusEnum.COMPLETED ||
      swapRequest.status === SwapStatusEnum.REFUNDED
    ) {
      throw new BadRequestException(
        'Cannot cancel swap request in current status',
      );
    }

    const switcherAId = swapRequest.resumeA?.userId ?? null;
    const switcherBId = swapRequest.resumeB?.userId ?? null;

    if (!switcherAId || !switcherBId) {
      throw new BadRequestException(
        'Resumes in this swap request must have owners (switchers).',
      );
    }

    const isSwitcherA = switcherAId === userId;
    const isSwitcherB = switcherBId === userId;

    if (!isSwitcherA && !isSwitcherB) {
      throw new BadRequestException(
        'Only the switcher (resume owner) can cancel the request by this endpoint.',
      );
    }

    if (isSwitcherA && swapRequest.managerACode) {
      throw new BadRequestException(
        'Cannot cancel: you have already invited HR for your side. Cancellation is only allowed before inviting HR.',
      );
    }
    if (isSwitcherB && swapRequest.managerBCode) {
      throw new BadRequestException(
        'Cannot cancel: you have already invited HR for your side. Cancellation is only allowed before inviting HR.',
      );
    }

    const cancelledByType = isSwitcherA
      ? CancelledByTypeEnum.PARTICIPANT_A
      : CancelledByTypeEnum.PARTICIPANT_B;

    swapRequest.status = SwapStatusEnum.CANCELLED;
    swapRequest.cancelledById = userId;
    swapRequest.cancelledByType = cancelledByType;
    swapRequest.cancelledAt = new Date();
    const saved = await this.swapRequestRepository.save(swapRequest);
    return this.maskSwitcherContactsIfNotPaid(
      saved,
      saved.status === SwapStatusEnum.COMPLETED,
    ) as SwapRequestEntity;
  }

  /**
   * Відміна скасування: відновлення реквеста, скасованого світчером.
   * Може викликати лише той самий світчер, який скасував (cancelledById).
   */
  async undoCancelBySwitcher(
    id: string,
    userId: string,
  ): Promise<SwapRequestEntity> {
    const swapRequest = await this.findOneOrFail(id);

    if (swapRequest.status !== SwapStatusEnum.CANCELLED) {
      throw new BadRequestException(
        'Only a cancelled swap request can be restored.',
      );
    }

    const cancelledBySwitcher =
      swapRequest.cancelledByType === CancelledByTypeEnum.PARTICIPANT_A ||
      swapRequest.cancelledByType === CancelledByTypeEnum.PARTICIPANT_B;

    if (!cancelledBySwitcher) {
      throw new BadRequestException(
        'Only requests cancelled by a switcher can be restored by this endpoint.',
      );
    }

    if (swapRequest.cancelledById !== userId) {
      throw new BadRequestException(
        'Only the switcher who cancelled the request can restore it.',
      );
    }

    swapRequest.status =
      swapRequest.participantAConfirmed && swapRequest.participantBConfirmed
        ? SwapStatusEnum.PARTICIPANTS_CONFIRMED
        : SwapStatusEnum.CREATED;
    swapRequest.cancelledById = null;
    swapRequest.cancelledByType = null;
    swapRequest.cancelledAt = null;

    const saved = await this.swapRequestRepository.save(swapRequest);
    return this.maskSwitcherContactsIfNotPaid(
      saved,
      saved.status === SwapStatusEnum.COMPLETED,
    ) as SwapRequestEntity;
  }

  async cancel(id: string, userId: string): Promise<SwapRequestEntity> {
    const swapRequest = await this.findOneOrFail(id);

    // Перевірка що заявка не вже скасована або завершена
    if (
      swapRequest.status === SwapStatusEnum.CANCELLED ||
      swapRequest.status === SwapStatusEnum.COMPLETED ||
      swapRequest.status === SwapStatusEnum.REFUNDED
    ) {
      throw new BadRequestException(
        'Cannot cancel swap request in current status',
      );
    }

    // Визначаємо ролі користувача
    const isSwitcherCreator = swapRequest.createdById === userId;
    const isSwitcherA = swapRequest.managerAId === userId;
    const isSwitcherB = swapRequest.managerBId === userId;
    const isManagerA =
      swapRequest.managerAId === userId && swapRequest.managerAJoined;
    const isManagerB =
      swapRequest.managerBId === userId && swapRequest.managerBJoined;

    // Перевірка чи хоч один менеджер приєднався
    const isManagerJoined =
      swapRequest.managerAJoined ||
      swapRequest.managerBJoined ||
      swapRequest.status === SwapStatusEnum.HR_A_JOINED ||
      swapRequest.status === SwapStatusEnum.HR_B_JOINED ||
      swapRequest.status === SwapStatusEnum.HR_BOTH_JOINED ||
      swapRequest.status === SwapStatusEnum.HR_A_CONFIRMED ||
      swapRequest.status === SwapStatusEnum.HR_B_CONFIRMED ||
      swapRequest.status === SwapStatusEnum.HR_BOTH_CONFIRMED ||
      swapRequest.status === SwapStatusEnum.PAYMENT_PENDING ||
      swapRequest.status === SwapStatusEnum.PAYMENT_A_HOLD ||
      swapRequest.status === SwapStatusEnum.PAYMENT_B_HOLD ||
      swapRequest.status === SwapStatusEnum.PAYMENT_BOTH_HOLD ||
      swapRequest.status === SwapStatusEnum.FIRST_PAYMENT_COMPLETED;

    let cancelledByType: CancelledByTypeEnum;

    if (isManagerJoined) {
      // Після того як менеджер підключився - може скасувати тільки менеджер з правильною роллю
      if (!isManagerA && !isManagerB) {
        throw new BadRequestException(
          'Only manager can cancel swap request after manager joined',
        );
      }

      // Перевіряємо роль користувача (HR, Admin, або Owner)
      const side = isManagerA ? 'A' : 'B';
      await this.checkUserRoleForSwapRequest(swapRequest, userId, side);

      cancelledByType = isManagerA
        ? CancelledByTypeEnum.HR_A
        : CancelledByTypeEnum.HR_B;
    } else {
      // До підключення менеджера - може скасувати або перший switcher (той хто створив), або другий switcher (managerA або managerB)
      if (!isSwitcherCreator && !isSwitcherA && !isSwitcherB) {
        throw new BadRequestException(
          'Only switcher can cancel swap request before manager joined',
        );
      }
      // Визначаємо тип того, хто відмінив
      if (isSwitcherA) {
        cancelledByType = CancelledByTypeEnum.PARTICIPANT_A;
      } else if (isSwitcherB) {
        cancelledByType = CancelledByTypeEnum.PARTICIPANT_B;
      }
    }

    // Якщо є платежі в hold - повертаємо їх
    if (
      swapRequest.stripePaymentIntentIdA ||
      swapRequest.stripePaymentIntentIdB
    ) {
      await this.refundHoldPayments(swapRequest);
    }

    // Скасовуємо заявку
    swapRequest.status = SwapStatusEnum.CANCELLED;
    swapRequest.cancelledById = userId;
    swapRequest.cancelledByType = cancelledByType;
    swapRequest.cancelledAt = new Date();
    const saved = await this.swapRequestRepository.save(swapRequest);

    // Надсилаємо лист іншому HR про скасування
    const otherHrEmail =
      cancelledByType === CancelledByTypeEnum.HR_A ||
      cancelledByType === CancelledByTypeEnum.PARTICIPANT_A
        ? saved.managerBEmail
        : cancelledByType === CancelledByTypeEnum.HR_B ||
            cancelledByType === CancelledByTypeEnum.PARTICIPANT_B
          ? saved.managerAEmail
          : null;
    if (otherHrEmail) {
      await this.sendSwapRequestCancelledEmailToHr(saved, otherHrEmail);
    }

    return this.maskSwitcherContactsIfNotPaid(
      saved,
      saved.status === SwapStatusEnum.COMPLETED,
    ) as SwapRequestEntity;
  }

  /**
   * Скасовує всі swap-request користувача, що ще не в термінальному стані
   * (завершено / скасовано / refunded). Викликається при видаленні акаунта.
   */
  async cancelOpenSwapRequestsForDeletedUser(userId: string): Promise<void> {
    const terminal = SwapRequestService.TAB_TERMINAL_STATUSES;
    const swaps = await this.swapRequestRepository
      .createQueryBuilder('swapRequest')
      .leftJoinAndSelect('swapRequest.resumeA', 'resumeA')
      .leftJoinAndSelect('swapRequest.resumeB', 'resumeB')
      .where('swapRequest.status NOT IN (:...terminal)', { terminal })
      .andWhere(
        `(
          swapRequest.createdById = :userId
          OR swapRequest.managerAId = :userId
          OR swapRequest.managerBId = :userId
          OR resumeA.userId = :userId
          OR resumeB.userId = :userId
        )`,
        { userId },
      )
      .getMany();

    for (const swap of swaps) {
      await this.cancelSwapRequestForAccountDeletion(swap, userId);
    }
  }

  private otherManagerEmailForAccountDeletion(
    swapRequest: SwapRequestEntity,
    deletedUserId: string,
  ): string | null {
    const onSideA =
      swapRequest.managerAId === deletedUserId ||
      swapRequest.resumeA?.userId === deletedUserId;
    const onSideB =
      swapRequest.managerBId === deletedUserId ||
      swapRequest.resumeB?.userId === deletedUserId;
    if (onSideA && !onSideB) {
      return swapRequest.managerBEmail;
    }
    if (onSideB && !onSideA) {
      return swapRequest.managerAEmail;
    }
    return swapRequest.managerAEmail ?? swapRequest.managerBEmail;
  }

  private cancelledByTypeForAccountDeletion(
    swapRequest: SwapRequestEntity,
    deletedUserId: string,
  ): CancelledByTypeEnum {
    // В акаунт-диліт є 4 можливі ролі в контексті swap request:
    // HR-A / HR-B (managerAId/managerBId) та Participant-A / Participant-B (resume owners).
    if (swapRequest.managerAId === deletedUserId) {
      return CancelledByTypeEnum.HR_A;
    }
    if (swapRequest.managerBId === deletedUserId) {
      return CancelledByTypeEnum.HR_B;
    }
    if (swapRequest.resumeA?.userId === deletedUserId) {
      return CancelledByTypeEnum.PARTICIPANT_A;
    }
    if (swapRequest.resumeB?.userId === deletedUserId) {
      return CancelledByTypeEnum.PARTICIPANT_B;
    }

    // Fallback для ситуацій, коли запит вже не містить потрібних даних.
    return CancelledByTypeEnum.ACCOUNT_DELETED;
  }

  private async cancelSwapRequestForAccountDeletion(
    swapRequest: SwapRequestEntity,
    deletedUserId: string,
  ): Promise<void> {
    const terminal = SwapRequestService.TAB_TERMINAL_STATUSES;
    if (terminal.includes(swapRequest.status)) {
      return;
    }

    if (
      swapRequest.stripePaymentIntentIdA ||
      swapRequest.stripePaymentIntentIdB
    ) {
      await this.refundHoldPayments(swapRequest);
    }

    swapRequest.status = SwapStatusEnum.CANCELLED;
    swapRequest.cancelledById = deletedUserId;
    swapRequest.cancelledByType = this.cancelledByTypeForAccountDeletion(
      swapRequest,
      deletedUserId,
    );
    swapRequest.cancelledAt = new Date();

    const saved = await this.swapRequestRepository.save(swapRequest);
    const otherHrEmail = this.otherManagerEmailForAccountDeletion(
      saved,
      deletedUserId,
    );
    if (otherHrEmail) {
      await this.sendSwapRequestCancelledEmailToHr(saved, otherHrEmail);
    }
  }

  /**
   * Надсилає лист іншому HR про скасування swap request (шаблон "Swap request cancelled").
   */
  private async sendSwapRequestCancelledEmailToHr(
    swapRequest: SwapRequestEntity,
    toEmail: string,
  ): Promise<void> {
    const requestDisplayId = swapRequest.numericId
      ? `#${swapRequest.numericId}`
      : swapRequest.id.slice(0, 8);
    const emailDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const html = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-size:17px;font-weight:bold;color:#fff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-size:11px;color:#6B7280;">${emailDate}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Swap request cancelled.</p>
            <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 20px;">Request <strong style="color:#111;">${requestDisplayId}</strong> has been cancelled by the other party. No charge was made.</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td style="background-color:#FEF2F2;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;padding:12px 14px;">
                  <p style="font-size:13px;color:#374151;line-height:1.6;margin:0;">No charge was made. Your employee remains in the matching pool and you'll be notified if a new compatible swap becomes available.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="https://hr.switcherhub.com" style="font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">hr.switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
    await this.mailService.sendMail(toEmail, 'Swap request cancelled', html);
  }

  /**
   * Повертає кошти з hold платежів при скасуванні swap request.
   * Для hold платежів (requires_capture) - скасовуємо payment intent.
   * Для захоплених платежів (succeeded) - робимо refund.
   */
  private async refundHoldPayments(
    swapRequest: SwapRequestEntity,
  ): Promise<void> {
    if (!this.stripe) {
      console.warn('Stripe is not configured. Cannot refund payments.');
      return;
    }

    const refundPromises: Promise<any>[] = [];

    if (swapRequest.stripePaymentIntentIdA) {
      refundPromises.push(
        this.handlePaymentRefund(swapRequest.stripePaymentIntentIdA, 'A'),
      );
    }

    if (swapRequest.stripePaymentIntentIdB) {
      refundPromises.push(
        this.handlePaymentRefund(swapRequest.stripePaymentIntentIdB, 'B'),
      );
    }

    await Promise.all(refundPromises);
  }

  /**
   * Обробляє повернення коштів для одного payment intent.
   * Для hold платежів (requires_capture) - скасовуємо payment intent.
   * Для захоплених платежів (succeeded) - робимо refund.
   */
  private async handlePaymentRefund(
    paymentIntentId: string,
    side: 'A' | 'B',
  ): Promise<void> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'requires_capture') {
        // Платеж в hold - скасовуємо payment intent (кошти автоматично повертаються)
        await this.stripe.paymentIntents.cancel(paymentIntentId);
        console.log(
          `Successfully cancelled payment intent ${side} (was on hold): ${paymentIntentId}`,
        );
      } else if (paymentIntent.status === 'succeeded') {
        // Платеж вже захоплений - робимо refund
        await this.stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
        console.log(
          `Successfully refunded payment intent ${side} (was captured): ${paymentIntentId}`,
        );
      } else {
        console.log(
          `Payment intent ${side} status is ${paymentIntent.status}, no refund needed: ${paymentIntentId}`,
        );
      }
    } catch (error) {
      console.error(
        `Failed to refund/cancel payment intent ${side} ${paymentIntentId}:`,
        error,
      );
      // Продовжуємо навіть якщо один refund не спрацював
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAndRefundExpiredPayments(): Promise<void> {
    if (!this.stripe) {
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Отримуємо всі запити зі статусами оплати (hold або first payment completed)
    const paymentStatuses = [
      SwapStatusEnum.PAYMENT_A_HOLD,
      SwapStatusEnum.PAYMENT_B_HOLD,
      SwapStatusEnum.PAYMENT_BOTH_HOLD,
      SwapStatusEnum.FIRST_PAYMENT_COMPLETED,
    ];

    const allRequests = await this.swapRequestRepository.find({
      where: paymentStatuses.map((status) => ({ status })),
    });

    // Фільтруємо ті, що старіші за 7 днів
    const expired = allRequests.filter((req) => {
      const holdDate =
        req.paymentAHoldAt || req.paymentBHoldAt || req.firstPaymentDate;
      return (
        holdDate &&
        holdDate < sevenDaysAgo &&
        (req.stripePaymentIntentIdA || req.stripePaymentIntentIdB)
      );
    });

    for (const swapRequest of expired) {
      // Повертаємо кошти з обох payment intents якщо вони є
      const promises: Promise<any>[] = [];

      if (swapRequest.stripePaymentIntentIdA) {
        promises.push(
          this.stripe.refunds
            .create({
              payment_intent: swapRequest.stripePaymentIntentIdA,
            })
            .catch((error) => {
              console.error(
                `Failed to refund payment intent A for swap request ${swapRequest.id}:`,
                error,
              );
            }),
        );
      }

      if (swapRequest.stripePaymentIntentIdB) {
        promises.push(
          this.stripe.refunds
            .create({
              payment_intent: swapRequest.stripePaymentIntentIdB,
            })
            .catch((error) => {
              console.error(
                `Failed to refund payment intent B for swap request ${swapRequest.id}:`,
                error,
              );
            }),
        );
      }

      await Promise.all(promises);

      swapRequest.status = SwapStatusEnum.REFUNDED;
      await this.swapRequestRepository.save(swapRequest);

      console.log(
        `Refunded payments for swap request ${swapRequest.id} after 7 days`,
      );
    }
  }

  /**
   * Статистика для дашборду: pending, active, completed, averageProcessingTime.
   * Тільки swap-реквести, де організація є workspace A або B. Користувач має бути членом організації.
   */
  async getDashboardStatistics(
    organizationId: string,
    userId: string,
  ): Promise<DashboardStatisticsDto> {
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    await this.workspaceService.getOrganizationById(organizationId, userId);

    const pendingStatuses = [
      SwapStatusEnum.CREATED,
      SwapStatusEnum.PARTICIPANTS_CONFIRMED,
      SwapStatusEnum.HR_INVITED,
      SwapStatusEnum.PAYMENT_PENDING,
    ];
    const terminalStatuses = [
      SwapStatusEnum.CANCELLED,
      SwapStatusEnum.REFUNDED,
      SwapStatusEnum.COMPLETED,
    ];
    const [pending, active, completed, avgResult] = await Promise.all([
      this.swapRequestRepository.count({
        where: [
          { status: In(pendingStatuses), workspaceAId: organizationId },
          { status: In(pendingStatuses), workspaceBId: organizationId },
        ],
      }),
      this.swapRequestRepository.count({
        where: [
          { status: Not(In(terminalStatuses)), workspaceAId: organizationId },
          { status: Not(In(terminalStatuses)), workspaceBId: organizationId },
        ],
      }),
      this.swapRequestRepository.count({
        where: [
          { status: SwapStatusEnum.COMPLETED, workspaceAId: organizationId },
          { status: SwapStatusEnum.COMPLETED, workspaceBId: organizationId },
        ],
      }),
      this.swapRequestRepository
        .createQueryBuilder('sr')
        .select(
          'AVG(EXTRACT(EPOCH FROM (sr.completedAt - sr.createdAt)))',
          'avgSeconds',
        )
        .where('sr.status = :status', { status: SwapStatusEnum.COMPLETED })
        .andWhere('sr.completedAt IS NOT NULL')
        .andWhere('(sr.workspaceAId = :orgId OR sr.workspaceBId = :orgId)', {
          orgId: organizationId,
        })
        .getRawOne<{ avgSeconds: string | null }>(),
    ]);

    const avgSeconds = avgResult?.avgSeconds
      ? parseFloat(avgResult.avgSeconds)
      : 0;
    const averageProcessingTimeHours = avgSeconds / 3600;
    const days = Math.floor(avgSeconds / 86400);
    const hours = Math.floor((avgSeconds % 86400) / 3600);
    const averageProcessingTimeFormatted =
      days > 0 ? `${days} дн. ${hours} год.` : `${hours} год.`;

    return {
      pending,
      active,
      completed,
      averageProcessingTimeHours:
        Math.round(averageProcessingTimeHours * 100) / 100,
      averageProcessingTimeFormatted,
    };
  }

  /**
   * Статистика для дашборду згрупована по менеджерах (managerA / managerB).
   * Тільки swap-реквести, де організація є workspace A або B. Користувач має бути членом організації.
   */
  async getDashboardStatisticsByManagers(
    organizationId: string,
    userId: string,
  ): Promise<DashboardStatisticsByManagerDto> {
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    await this.workspaceService.getOrganizationById(organizationId, userId);

    const pendingStatuses = [
      SwapStatusEnum.CREATED,
      SwapStatusEnum.PARTICIPANTS_CONFIRMED,
      SwapStatusEnum.HR_INVITED,
      SwapStatusEnum.PAYMENT_PENDING,
    ];
    const terminalStatuses = [
      SwapStatusEnum.CANCELLED,
      SwapStatusEnum.REFUNDED,
      SwapStatusEnum.COMPLETED,
    ];

    const requests = await this.swapRequestRepository.find({
      where: [
        { workspaceAId: organizationId },
        { workspaceBId: organizationId },
      ],
      select: [
        'managerAId',
        'managerBId',
        'workspaceAId',
        'workspaceBId',
        'status',
        'createdAt',
        'completedAt',
      ],
    });

    type ManagerStats = {
      pending: number;
      active: number;
      completed: number;
      completedDurationsSeconds: number[];
    };
    const byManager = new Map<string, ManagerStats>();

    const ensureManager = (id: string) => {
      if (!byManager.has(id)) {
        byManager.set(id, {
          pending: 0,
          active: 0,
          completed: 0,
          completedDurationsSeconds: [],
        });
      }
      return byManager.get(id)!;
    };

    for (const r of requests) {
      const add = (managerId: string | null) => {
        if (!managerId) return;
        const stats = ensureManager(managerId);
        if (pendingStatuses.includes(r.status)) stats.pending++;
        if (!terminalStatuses.includes(r.status)) stats.active++;
        if (r.status === SwapStatusEnum.COMPLETED) {
          stats.completed++;
          if (r.completedAt) {
            const sec =
              (r.completedAt.getTime() - r.createdAt.getTime()) / 1000;
            stats.completedDurationsSeconds.push(sec);
          }
        }
      };
      // Лише менеджер нашої організації (сторона A або B, де workspace = наша орг)
      if (r.workspaceAId === organizationId) add(r.managerAId);
      if (r.workspaceBId === organizationId) add(r.managerBId);
    }

    const managerIds = Array.from(byManager.keys());
    const users =
      managerIds.length > 0
        ? await this.userRepository.find({
            where: { id: In(managerIds) },
            select: ['id', 'email', 'firstName', 'lastName'],
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const formatDuration = (avgSeconds: number) => {
      const days = Math.floor(avgSeconds / 86400);
      const hours = Math.floor((avgSeconds % 86400) / 3600);
      return days > 0 ? `${days} дн. ${hours} год.` : `${hours} год.`;
    };

    const items: DashboardStatisticsByManagerItemDto[] = managerIds.map(
      (id) => {
        const stats = byManager.get(id)!;
        const user = userMap.get(id);
        const avgSeconds =
          stats.completedDurationsSeconds.length > 0
            ? stats.completedDurationsSeconds.reduce((a, b) => a + b, 0) /
              stats.completedDurationsSeconds.length
            : 0;
        const averageProcessingTimeHours =
          Math.round((avgSeconds / 3600) * 100) / 100;

        return {
          manager: user
            ? {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isDeleted: false,
              }
            : {
                id,
                email: '',
                firstName: null,
                lastName: null,
                isDeleted: true,
              },
          pending: stats.pending,
          active: stats.active,
          completed: stats.completed,
          averageProcessingTimeHours,
          averageProcessingTimeFormatted: formatDuration(avgSeconds),
        };
      },
    );

    return { items };
  }
}
