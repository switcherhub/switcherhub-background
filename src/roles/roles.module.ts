import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleCategoryEntity } from './entities/role-category.entity';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, RoleCategoryEntity])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
