import { Module } from '@nestjs/common';
import { SubscritpionWebhookController } from './controllers/subscription-webhook.controller';
import { UsersModule } from './users.module';
import { VacancyModule } from 'src/vacancy/vacancy.module';
import { ResumeModule } from 'src/resume/resume.module';

@Module({
  imports: [UsersModule, VacancyModule, ResumeModule],
  controllers: [SubscritpionWebhookController],
  providers: [],
  exports: [],
})
export class SubscriptionWebhookModule {}
