import { Module } from '@nestjs/common';
import { SearchController } from './controller/search.controller';
import { VacancyModule } from 'src/vacancy/vacancy.module';
import { ResumeModule } from 'src/resume/resume.module';
import { SearchViewService } from './services/search-view.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchResumeVacancyView } from './entities/search.entity';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { UserListModule } from 'src/user-list/user-list.module';
import { UserListSelectModule } from 'src/user-list/user-list-select.module';

@Module({
  imports: [
    VacancyModule,
    ResumeModule,
    TypeOrmModule.forFeature([SearchResumeVacancyView]),
    UserListSelectModule,
  ],
  controllers: [SearchController],
  providers: [SearchViewService, TypeOrmSelectService],
})
export class SearchModule {}
