import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwapRequestEntity } from './entities/swap-request.entity';
import { SwapRequestService } from './services/swap-request.service';
import { SwapRequestController } from './controllers/swap-request.controller';
import { ResumeModule } from 'src/resume/resume.module';
import { UsersModule } from 'src/users/users.module';
import { MailModule } from 'src/mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from 'src/chat/chat.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { ResumeComparisonModule } from 'src/resume-comparison/resume-comparison.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapRequestEntity, UserEntity]),
    ConfigModule,
    ResumeModule,
    forwardRef(() => UsersModule),
    MailModule,
    ResumeComparisonModule,
    NotificationModule,
    forwardRef(() => ChatModule),
    forwardRef(() => WorkspaceModule),
  ],
  controllers: [SwapRequestController],
  providers: [SwapRequestService],
  exports: [SwapRequestService],
})
export class SwapRequestModule {}

