import { UserSubscriptionService } from 'src/users/services/user-subscription.service';
import { Body, Controller, Post } from '@nestjs/common';
import { RevenueCatWebhookEvent } from '../interfaces/revenue-cat.interface';

import { VacancyUserService } from 'src/vacancy/services/vacancy-user.service';
import { ResumeUserService } from 'src/resume/services/resume-user.service';

@Controller('user/subscription/webhook')
export class SubscritpionWebhookController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
    private readonly vacancyUserService: VacancyUserService,
    private readonly resumeUserService: ResumeUserService,
  ) {}

  @Post('revenue-cat')
  async handleRevenueCatWebhook(
    @Body() body: RevenueCatWebhookEvent,
  ): Promise<void> {
    await this.userSubscriptionService.handleRevenueCatWebhook(body);

    await this.vacancyUserService.checkAvailableCount(body.event.app_user_id);

    await this.resumeUserService.checkAvailableCount(body.event.app_user_id);
  }
}
