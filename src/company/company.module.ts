import { CompanyController } from './controllers/company.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company.entity';
import { Module } from '@nestjs/common';
import { CompanyService } from './services/company.service';
import { CompanyBaseController } from './controllers/company.base-controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { CompanyMockService } from './services/company-mock.service';
import { IndustryModule } from 'src/industry/industry.module';
import { CompanyAdminController } from './controllers/company.admin.controller';
import { UsersModule } from 'src/users/users.module';
import { CompanyUserService } from './services/company-user.service';
import { CompanyTypeModule } from 'src/company-type/company-type.module';
import { EmployeeNumberModule } from 'src/employee-number/employee-number.module';
import { UserListSelectModule } from 'src/user-list/user-list-select.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyEntity]),
    IndustryModule,
    CompanyTypeModule,
    EmployeeNumberModule,
    UsersModule,
    UserListSelectModule,
  ],
  controllers: [
    CompanyAdminController,
    CompanyController,
    CompanyBaseController,
  ],
  providers: [
    CompanyService,
    CompanyUserService,
    CompanyMockService,
    TypeOrmSelectService,
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
