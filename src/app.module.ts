import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OperatorModule } from './operator/operator.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { UserAuthModule } from './user-auth/user-authorization.module';
import { JobTypeModule } from './job-type/job-type.module';
import { AdminModule } from './admin/admin.module';
import { IndustryModule } from './industry/industry.module';
import { WorkExpirianceModule } from './work-expiriance/work-expiriance.module';
import { EducationModule } from './education/education.module';
import { CompanyTypeModule } from './company-type/company-type.module';
import { JobCoreModule } from './job-core/job-core.module';
import { WorkEnvironmentModule } from './work-environment/work-environment.module';
import { ShiftTypeModule } from './shift-type/shift-type.module';
import { LocationTenureModule } from './location-tenure/location-tenure.module';
import { SameRoleCountModule } from './same-role-count/same-role-count.module';
import { TimeToStartWorkingModule } from './time-to-start-working/time-to-start-working.module';
import { LicenseRequiredModule } from './license-required/license-required.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { ResumeModule } from './resume/resume.module';
import { ResumeComparisonModule } from './resume-comparison/resume-comparison.module';
import { FileManagerModule } from './file-manager/file-manager.module';
import { CompanyModule } from './company/company.module';
import { EmployeeNumberModule } from './employee-number/employee-number.module';
// import { VacancyModule } from './vacancy/vacancy.module';
import { BenefitModule } from './benefit/benefit.module';
import { IssueModule } from './issue/issue.module';
import { ReportModule } from './report/report.module';
import { ReportTypeModule } from './report-type/report-type.module';
// import { SearchModule } from './search/search.module';
import { ParserModule } from './parser/parser.module';

import { ScheduleModule } from '@nestjs/schedule';
import { UserListModule } from './user-list/user-list.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule } from '@nestjs/config';
import { loggerMiddleware } from './app/exception-filter/logger';

import { AppVersionModule } from './app-version/app-version.module';
import { SubscriptionWebhookModule } from './users/subscription-webhook.module';
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { MeModule } from './users/me.module';
import { GlobalCacheModule } from './cache/cache.module';
import { SwapRequestModule } from './swap-request/swap-request.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    GlobalCacheModule,
    ConfigModule.forRoot(),
    AuthModule,
    DatabaseModule,
    OperatorModule,
    SubscriptionWebhookModule,
    UsersModule,
    MeModule,
    UserAuthModule,
    AdminModule,
    ScheduleModule.forRoot(),
    JobTypeModule,
    IndustryModule,
    WorkExpirianceModule,
    EducationModule,
    CompanyTypeModule,
    EmployeeNumberModule,
    JobCoreModule,
    WorkEnvironmentModule,
    ShiftTypeModule,
    LocationTenureModule,
    SameRoleCountModule,
    TimeToStartWorkingModule,
    LicenseRequiredModule,
    ConfigurationModule,
    BenefitModule,
    ReportTypeModule,
    ResumeModule,
    ResumeComparisonModule,
    CompanyModule,
    // VacancyModule,
    FileManagerModule,
    IssueModule,
    ReportModule,
    // SearchModule,
    ParserModule,
    UserListModule,
    SubscriptionModule,
    NotificationModule,
    AppVersionModule,

    ChatModule,
    MessageModule,
    SwapRequestModule,
    WorkspaceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(loggerMiddleware).forRoutes('*');
  }
}
