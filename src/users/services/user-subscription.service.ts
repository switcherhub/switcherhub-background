import { Injectable } from '@nestjs/common';
import { UserService } from './user.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { LimitationsInterface } from '../interfaces/limitations.interface';
import { RevenueCatWebhookEvent } from 'src/users/interfaces/revenue-cat.interface';

@Injectable()
export class UserSubscriptionService {
  constructor(
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async onModuleInit() {}

  async findUserLimitations(userId: string): Promise<LimitationsInterface> {
    try {
      const user = await this.userService.findOneOrFail(userId);
      let userSubscription = null;

      if (user.subscriptionId) {
        userSubscription = await this.subscriptionService.findOneOrFail(
          user.subscriptionId,
        );
      } else {
        userSubscription = null;
        // await this.subscriptionService.findFreePlan();
      }

      // console.log('User Limitations:', user);
      // console.log('Subscription Limitations:', subscription);
      // console.log('User Subscription:', userSubscription);

      return {
        resumeCount: user.resumeCount || userSubscription.resumeCount,
        vacanciesCount: user.vacanciesCount || userSubscription.vacanciesCount,
        companiesCount: user.companiesCount || userSubscription.companiesCount,

        showContctactsDaily:
          user.showContctactsDaily || userSubscription.showContctactsDaily,
        chatCountDaily: user.chatCountDaily || userSubscription.chatCountDaily,
        appliesCountDaily:
          user.appliesCountDaily || userSubscription.appliesCountDaily,

        upgradeCount: user.upgradeCount || userSubscription.upgradeCount,
      };
    } catch (error) {
      console.error('Error finding user limitations:', error);

      return {
        resumeCount: 10,
        vacanciesCount: 1,
        companiesCount: 5,

        showContctactsDaily: 10,
        chatCountDaily: 10,
        appliesCountDaily: 10,

        upgradeCount: 0,
      };
    }
  }

  async handleRevenueCatWebhook(body: RevenueCatWebhookEvent): Promise<void> {
    const user = await this.userService.findOneOrFail(body.event.app_user_id);

    const subscription = await this.subscriptionService.findOneByField(
      'productId',
      body.event.entitlement_ids[0] ?? body.event.entitlement_id,
    );

    if (!subscription) {
      console.warn(
        `Subscription not found for product ID: ${body.event.entitlement_id}`,
      );
      return;
    }

    switch (body.event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
      case 'NON_RENEWING_PURCHASE':
      case 'SUBSCRIPTION_EXTENDED':
      case 'TEMPORARY_ENTITLEMENT_GRANT':
      case 'REFUND_REVERSED':
        user.subscriptionId = subscription.id;
        break;

      case 'EXPIRATION':
        user.subscriptionId = null;
        break;

      case 'CANCELLATION':
      case 'BILLING_ISSUE':
      case 'SUBSCRIPTION_PAUSED':
      case 'TRANSFER':
      case 'INVOICE_ISSUANCE':
        break;
    }

    await this.userService.update(user);

    // await this.checkUserVacanciesCount(user.id);
  }
}
