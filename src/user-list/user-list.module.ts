import { TypeOrmModule } from '@nestjs/typeorm';

import { UserListEntity } from './entities/user-list.entity';
import { Module } from '@nestjs/common';
import { UserListService } from './services/user-list.service';
import { UserListAdminController } from './controllers/user-list.admin.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { UserListController } from './controllers/user-list.controller';
import { VacancyModule } from 'src/vacancy/vacancy.module';
import { ResumeModule } from 'src/resume/resume.module';
import { CompanyModule } from 'src/company/company.module';
import { UsersModule } from 'src/users/users.module';
import { UserListViewService } from './services/user-list-view.service';
import { UserListViewEntity } from './entities/user-list.view.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserListEntity, UserListViewEntity]),
    VacancyModule,
    ResumeModule,
    CompanyModule,
    UsersModule,
  ],
  controllers: [UserListAdminController, UserListController],
  providers: [UserListService, UserListViewService, TypeOrmSelectService],
  exports: [UserListService],
})
export class UserListModule {}
