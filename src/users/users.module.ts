import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { DeletedAccountEmailEntity } from './entities/deleted-account-email.entity';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserAuthEntity } from 'src/user-auth/user-auth/user-auth.entity';
import { UserAuthService } from 'src/user-auth/user-auth/user-auth.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { OperatorModule } from 'src/operator/operator.module';
import { MailModule } from 'src/mail/mail.module';
import { UserSubscriptionService } from './services/user-subscription.service';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { NotificationModule } from 'src/notification/notification.module';
import { SwapRequestModule } from 'src/swap-request/swap-request.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserAuthEntity,
      DeletedAccountEmailEntity,
    ]),
    OperatorModule,
    MailModule,
    SubscriptionModule,
    NotificationModule,
    forwardRef(() => SwapRequestModule),
  ],
  controllers: [UserController],
  providers: [
    UserSubscriptionService,
    UserService,
    UserAuthService,
    TypeOrmSelectService,
  ],
  exports: [UserService, UserSubscriptionService],
})
export class UsersModule {}
