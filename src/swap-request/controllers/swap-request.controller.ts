import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  Req,
  RawBodyRequest,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { SwapRequestService } from '../services/swap-request.service';
import { SwapRequestCreateDto } from '../dto/swap-request-create.dto';
import { ParticipantConfirmDto } from '../dto/participant-confirm.dto';
import { HrInviteDto } from '../dto/hr-invite.dto';
import { HrJoinDto } from '../dto/hr-join.dto';
import { PaymentIntentCreateDto } from '../dto/payment-intent-create.dto';
import { AbstractValidationPipe } from 'src/utils/abstract-validation.pipe';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatService } from 'src/chat/services/chat.service';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { SwapRequestEntity } from '../entities/swap-request.entity';
import { SwapRequestStatusType } from '../dto/swap-request-response.dto';
import { DashboardStatisticsDto } from '../dto/dashboard-statistics.dto';
import { DashboardStatisticsByManagerDto } from '../dto/dashboard-statistics-by-manager.dto';
import { ConsentService } from 'src/consent/consent.service';
import { HrDecisionEnum } from '../types/hr-decision.enum';

type SwapRequestListItem = SwapRequestEntity & {
  tab: SwapRequestStatusType;
  step: number;
};

@Controller('swap-request')
export class SwapRequestController {
  constructor(
    private readonly swapRequestService: SwapRequestService,
    private readonly chatService: ChatService,
    private readonly consentService: ConsentService,
  ) {}

  @Post()
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(SwapRequestCreateDto))
  async create(
    @Body() createDto: SwapRequestCreateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.create(createDto, user.id);
  }

  // ── Two-sided consent before employer contact (spec §8.3, FR-015/016) ──
  @Post(':id/authorize')
  @UseGuards(JwtUserAuthGuard)
  async authorize(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Body('proposalVersion') proposalVersion: number,
    @Body('recipientId') recipientId?: string,
  ) {
    return this.consentService.authorize({
      swapId: id,
      actorId: user.id,
      proposalVersion: Number(proposalVersion),
      recipientId: recipientId ?? null,
    });
  }

  @Post(':id/withdraw')
  @UseGuards(JwtUserAuthGuard)
  async withdrawConsent(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Body('proposalVersion') proposalVersion: number,
  ) {
    return this.consentService.withdraw(id, user.id, Number(proposalVersion));
  }

  @Get(':id/consent-status')
  @UseGuards(JwtUserAuthGuard)
  async consentStatus(@Param('id') id: string) {
    return this.consentService.status(id);
  }

  // ── Explicit HR decisions, separate from payment (spec §5 S10) ──
  @Post(':id/hr-decision')
  @UseGuards(JwtUserAuthGuard)
  async hrDecision(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Body('decision') decision: string,
  ) {
    const allowed = ['approved', 'declined', 'needs_clarification'];
    if (!allowed.includes(decision)) {
      throw new BadRequestException(
        `decision must be one of ${allowed.join(', ')}`,
      );
    }
    return this.swapRequestService.recordHrDecision(
      id,
      user.id,
      decision as HrDecisionEnum,
    );
  }

  @Get(':id/hr-progress')
  @UseGuards(JwtUserAuthGuard)
  async hrProgress(@Param('id') id: string, @GetUser() user: UserEntity) {
    return this.swapRequestService.getHrProgress(id, user.id);
  }

  @Get()
  @UseGuards(JwtUserAuthGuard)
  async findAll(
    @Query('search') search: string,
    @Query() query: any,
    @GetUser() user: UserEntity,
  ): Promise<FilterResponseInterface<SwapRequestListItem>> {
    const filter = parseQueryFilters(query);

    return this.swapRequestService.findAll(user.id, filter, search);
  }

  @Get('dashboard/statistics')
  @UseGuards(JwtUserAuthGuard)
  async getDashboardStatistics(
    @Query('organizationId') organizationId: string,
    @GetUser() user: UserEntity,
  ): Promise<DashboardStatisticsDto> {
    return this.swapRequestService.getDashboardStatistics(
      organizationId,
      user.id,
    );
  }

  @Get('dashboard/statistics/by-managers')
  @UseGuards(JwtUserAuthGuard)
  async getDashboardStatisticsByManagers(
    @Query('organizationId') organizationId: string,
    @GetUser() user: UserEntity,
  ): Promise<DashboardStatisticsByManagerDto> {
    return this.swapRequestService.getDashboardStatisticsByManagers(
      organizationId,
      user.id,
    );
  }

  /**
   * Список swap-реквестів для менеджера з опційними табами.
   * Без ?tab= повертаються реквести з усіх табів; з ?tab= — лише обраний таб.
   * tab=new — приєднані, але не підтвердили участь
   * tab=active — вже підтвердили участь
   * tab=failed — скасовані
   * tab=success — завершені
   * У відповіді завжди є tabCounts: { new, active, success, failed } для всіх табів.
   */
  @Get('manager')
  @UseGuards(JwtUserAuthGuard)
  async findAllForManager(
    @Query('tab') tab: string | string[],
    @Query('search') search: string,
    @Query() query: any,
    @GetUser() user: UserEntity,
  ): Promise<
    FilterResponseInterface<SwapRequestListItem> & {
      tabCounts: {
        new: number;
        active: number;
        success: number;
        failed: number;
      };
    }
  > {
    const filter = parseQueryFilters(query);
    const allowedTabs: SwapRequestStatusType[] = [
      'new',
      'active',
      'success',
      'failed',
    ];
    const tabValue = Array.isArray(tab) ? tab[0] : tab;
    const tabParam =
      tabValue && allowedTabs.includes(tabValue as SwapRequestStatusType)
        ? (tabValue as SwapRequestStatusType)
        : undefined;

    return this.swapRequestService.findAllForManager(
      user.id,
      filter,
      search,
      tabParam,
    );
  }

  /** Список swap-реквестів по табу (new | active | success | failed | all) з пагінацією та кількістю по вкладках. Без tab або tab=all — усі реквести. */
  @Get('by-tab')
  @UseGuards(JwtUserAuthGuard)
  async findAllByTab(
    @Query('tab') tab: string,
    @Query('search') search: string,
    @Query() query: any,
    @GetUser() user: UserEntity,
  ) {
    const allowedTabs: (SwapRequestStatusType | 'all')[] = [
      'new',
      'active',
      'success',
      'failed',
      'all',
    ];
    const tabParam = !tab || tab === 'all' ? 'all' : tab;
    if (!allowedTabs.includes(tabParam as SwapRequestStatusType | 'all')) {
      throw new BadRequestException(
        `Query param "tab" must be one of: ${allowedTabs.join(', ')}`,
      );
    }
    const filter = parseQueryFilters(query);
    return this.swapRequestService.findAllByTab(
      user.id,
      tabParam as SwapRequestStatusType | 'all',
      filter,
      search,
      user.activeRole,
    );
  }

  @Post('hr/join')
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(HrJoinDto))
  async joinHrByCode(@Body() joinDto: HrJoinDto, @GetUser() user: UserEntity) {
    return this.swapRequestService.joinHrByCode(joinDto, user.id);
  }

  /** Публічний ендпоінт: попередній перегляд swap та резюме за HR-кодом. */
  @Get('hr/preview/:code')
  async getPreviewByManagerCode(@Param('code') code: string) {
    return this.swapRequestService.getPreviewByManagerCode(code);
  }

  @Put(':id/confirm-manager-participation')
  @UseGuards(JwtUserAuthGuard)
  async confirmManagerParticipation(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.confirmManagerParticipation(id, user.id);
  }

  @Put(':id/mark-read')
  @UseGuards(JwtUserAuthGuard)
  async markSwapAsRead(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.markSwapAsRead(id, user.id);
  }

  @Get(':id')
  @UseGuards(JwtUserAuthGuard)
  async findOne(@Param('id') id: string, @GetUser() user: UserEntity) {
    return this.swapRequestService.findOneWithStatus(id, user.id);
  }

  @Get(':id/chat')
  @UseGuards(JwtUserAuthGuard)
  async getChat(@Param('id') id: string, @GetUser() user: UserEntity) {
    await this.swapRequestService.findOneOrFail(id);
    const chat = await this.chatService.getSwapRequestChat(id);
    if (!chat) {
      throw new Error('Chat for this swap request is not available');
    }
    const isParticipant =
      chat.ownerId === user.id || chat.participantId === user.id;
    if (!isParticipant) {
      throw new Error('You are not authorized to access this chat');
    }
    return chat;
  }

  /** Лише підтвердження участі світчером (без контактних даних). Контакти — етап 2: PUT :id/participant-contact */
  @Put(':id/confirm-participant')
  @UseGuards(JwtUserAuthGuard)
  async confirmParticipant(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.confirmParticipant(id, user.id);
  }

  /** Оновлення своїх контактних даних світчером (лише на своїй стороні). */
  @Put(':id/participant-contact')
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(ParticipantConfirmDto))
  async updateParticipantContact(
    @Param('id') id: string,
    @Body() updateDto: ParticipantConfirmDto,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.updateParticipantContact(
      id,
      updateDto,
      user.id,
    );
  }

  @Post(':id/invite-hr')
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(HrInviteDto))
  async inviteHr(
    @Param('id') id: string,
    @Body() inviteDto: HrInviteDto,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.inviteHr(id, inviteDto, user.id);
  }

  @Post(':id/payment-intent')
  @UseGuards(JwtUserAuthGuard)
  @UsePipes(new AbstractValidationPipe(PaymentIntentCreateDto))
  async createPaymentIntent(
    @Param('id') id: string,
    @Body() dto: PaymentIntentCreateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.createPaymentIntent(id, user.id, dto);
  }

  /** Скасування реквеста від імені світчера (дозволено лише доки не запросив ейчара). */
  @Delete('by-switcher/:id')
  @UseGuards(JwtUserAuthGuard)
  async cancelBySwitcher(@Param('id') id: string, @GetUser() user: UserEntity) {
    return this.swapRequestService.cancelBySwitcher(id, user.id);
  }

  /** Відміна скасування: відновлення реквеста (лише той світчер, який скасував). */
  @Put('by-switcher/:id/undo-cancel')
  @UseGuards(JwtUserAuthGuard)
  async undoCancelBySwitcher(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ) {
    return this.swapRequestService.undoCancelBySwitcher(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtUserAuthGuard)
  async cancel(@Param('id') id: string, @GetUser() user: UserEntity) {
    return this.swapRequestService.cancel(id, user.id);
  }

  @Post('webhook/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new Error('Webhook secret not configured');
    }

    if (!sig) {
      console.error('Missing stripe-signature header');
      throw new Error('Missing stripe-signature header');
    }

    let event: any;

    try {
      // Stripe вимагає raw body для верифікації підпису
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new Error('Raw body is required for Stripe webhook verification');
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Webhook signature verification failed');
    }

    await this.swapRequestService.handleStripeWebhook(event);

    return { received: true };
  }
}
