import { ResumeController } from './controllers/resume.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ResumeEntity } from './entities/resume.entity';
import { Module, forwardRef } from '@nestjs/common';
import { ResumeService } from './services/resume.service';
import { ResumeBaseController } from './controllers/resume.base-controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { ResumeMockService } from './services/resume-mock.service';
import { ResumeAdminController } from './controllers/resume.admin.controller';
import { UsersModule } from 'src/users/users.module';
import { ResumeUserService } from './services/resume-user.service';
import { UserListSelectModule } from 'src/user-list/user-list-select.module';
import { JobCoreModule } from 'src/job-core/job-core.module';
import { JobTypeModule } from 'src/job-type/job-type.module';
import { WorkEnvironmentModule } from 'src/work-environment/work-environment.module';
import { ShiftTypeModule } from 'src/shift-type/shift-type.module';
import { LocationTenureModule } from 'src/location-tenure/location-tenure.module';
import { SameRoleCountModule } from 'src/same-role-count/same-role-count.module';
import { TimeToStartWorkingModule } from 'src/time-to-start-working/time-to-start-working.module';
import { LicenseRequiredModule } from 'src/license-required/license-required.module';
import { ConfigModule } from '@nestjs/config';
import { RoutingMatrixModule } from 'src/routing-matrix/routing-matrix.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeEntity]),
    ConfigModule,
    // UsersModule -> SwapRequestModule -> ResumeModule -> UsersModule (cycle),
    // тому тут потрібен forwardRef.
    forwardRef(() => UsersModule),
    UserListSelectModule,
    JobCoreModule,
    JobTypeModule,
    WorkEnvironmentModule,
    ShiftTypeModule,
    LocationTenureModule,
    SameRoleCountModule,
    TimeToStartWorkingModule,
    LicenseRequiredModule,
    RoutingMatrixModule,
  ],
  controllers: [ResumeAdminController, ResumeController, ResumeBaseController],
  providers: [
    ResumeService,
    ResumeUserService,
    ResumeMockService,
    TypeOrmSelectService,
  ],
  exports: [ResumeService, ResumeUserService],
})
export class ResumeModule {}
