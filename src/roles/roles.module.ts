import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleCategoryEntity } from './entities/role-category.entity';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/roles.controller';
import { ResumeEntity } from 'src/resume/entities/resume.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, RoleCategoryEntity, ResumeEntity]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
