import { VacancyController } from './controllers/vacancy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VacancyEntity } from './entities/vacancy.entity';
import { Module } from '@nestjs/common';
import { VacancyService } from './services/vacancy.service';
import { VacancyBaseController } from './controllers/vacancy.base-controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { VacancyMockService } from './services/vacancy-mock.service';
import { JobTypeModule } from 'src/job-type/job-type.module';
import { IndustryModule } from 'src/industry/industry.module';
import { EducationModule } from 'src/education/education.module';
import { VacancyAdminController } from './controllers/vacancy.admin.controller';
import { UsersModule } from 'src/users/users.module';
import { VacancyUserService } from './services/vacancy-user.service';
import { CompanyModule } from 'src/company/company.module';
import { WorkExpirianceModule } from 'src/work-expiriance/work-expiriance.module';
import { PerkModule } from 'src/perk/perk.module';
import { BenefitModule } from 'src/benefit/benefit.module';
import { UserListSelectModule } from 'src/user-list/user-list-select.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VacancyEntity]),
    JobTypeModule,
    IndustryModule,
    EducationModule,
    UsersModule,
    CompanyModule,
    WorkExpirianceModule,
    PerkModule,
    BenefitModule,
    UserListSelectModule,
  ],
  controllers: [
    VacancyAdminController,
    VacancyController,
    VacancyBaseController,
  ],
  providers: [
    VacancyService,
    VacancyUserService,
    VacancyMockService,
    TypeOrmSelectService,
  ],
  exports: [VacancyService, VacancyUserService],
})
export class VacancyModule {}
