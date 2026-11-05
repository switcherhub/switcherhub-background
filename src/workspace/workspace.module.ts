import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceMemberEntity } from './entities/workspace-member.entity';
import { WorkspaceInvitationEntity } from './entities/workspace-invitation.entity';
import { WorkspacePaymentMethodEntity } from './entities/workspace-payment-method.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { WorkspaceService } from './services/workspace.service';
import { WorkspacePermissionsService } from './services/workspace-permissions.service';
import { WorkspacePaymentMethodService } from './services/workspace-payment-method.service';
import { WorkspaceController } from './controllers/workspace.controller';
import { OrganizationController } from './controllers/organization.controller';
import { WorkspacePaymentMethodController } from './controllers/workspace-payment-method.controller';
import { SwapRequestModule } from 'src/swap-request/swap-request.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceEntity,
      WorkspaceMemberEntity,
      WorkspaceInvitationEntity,
      WorkspacePaymentMethodEntity,
      UserEntity,
    ]),
    ConfigModule,
    forwardRef(() => SwapRequestModule),
    MailModule,
  ],
  controllers: [
    WorkspaceController,
    OrganizationController,
    WorkspacePaymentMethodController,
  ],
  providers: [
    WorkspaceService,
    WorkspacePermissionsService,
    WorkspacePaymentMethodService,
  ],
  exports: [WorkspaceService, WorkspacePaymentMethodService],
})
export class WorkspaceModule {}
