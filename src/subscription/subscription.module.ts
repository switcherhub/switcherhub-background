import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity } from './entities/subscription.entity';
import { Module } from '@nestjs/common';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionAdminController } from './controllers/subscription.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { SubscriptionUserController } from './controllers/subscription.user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity])],
  controllers: [SubscriptionAdminController, SubscriptionUserController],
  providers: [SubscriptionService, TypeOrmSelectService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
