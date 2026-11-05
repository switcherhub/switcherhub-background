import { Controller, Get } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscription')
export class SubscriptionUserController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('all')
  async getAllSubscriptions() {
    return this.subscriptionService.findAll();
  }
}
