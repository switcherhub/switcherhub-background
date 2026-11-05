import { UserService } from 'src/users/services/user.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { NotificationService } from 'src/notification/services/notification.service';
import { UserSubscriptionService } from './user-subscription.service';
import { SwapRequestService } from 'src/swap-request/services/swap-request.service';

@Injectable()
export class MeService {
  constructor(
    private readonly userService: UserService,
    private readonly swapRequestService: SwapRequestService,
    private readonly notificationService: NotificationService,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  async getMe(user: UserEntity): Promise<any> {
    try {
      const userWithSub = await this.userService.findOneOrFail(user.id, [
        'subscription',
      ]);

      const notificationsCount = await this.notificationService.unreadCount(
        user.id,
      );

      const byTab =
        await this.swapRequestService.getUnreadMessagesCountByTab(
          user.id,
          user.activeRole,
        );
      const unreadMessagesCount =
        byTab.new + byTab.active + byTab.success + byTab.failed;

      const limits = await this.userSubscriptionService.findUserLimitations(
        user.id,
      );

      return {
        ...userWithSub,
        notificationsCount,
        unreadMessagesCount,
        limits,
      };
    } catch (error) {
      console.error('Error getting user by token:', error);
      throw new NotFoundException(error);
    }
  }
}
