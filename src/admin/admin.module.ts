import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserAdminController } from './controllers/user.admin.controller';
import { HrManagersAdminController } from './controllers/hr-managers.admin.controller';
import { SwitchersAdminController } from './controllers/switchers.admin.controller';
import { SwapsAdminController } from './controllers/swaps.admin.controller';
import { HrManagersAdminService } from './services/hr-managers-admin.service';
import { SwitchersAdminService } from './services/switchers-admin.service';
import { SwapsAdminService } from './services/swaps-admin.service';
import { UsersModule } from 'src/users/users.module';
import { WorkspaceMemberEntity } from 'src/workspace/entities/workspace-member.entity';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    TypeOrmModule.forFeature([
      WorkspaceMemberEntity,
      WorkspaceEntity,
      SwapRequestEntity,
      ResumeEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    UserAdminController,
    HrManagersAdminController,
    SwitchersAdminController,
    SwapsAdminController,
  ],
  providers: [HrManagersAdminService, SwitchersAdminService, SwapsAdminService],
})
export class AdminModule {}
