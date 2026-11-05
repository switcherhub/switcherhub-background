import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { WorkspacePermissionGuard } from '../guards/workspace-permission.guard';
import { RequireWorkspacePermission } from '../decorators/workspace-permission.decorator';
import { WorkspacePermissionEnum } from '../types/workspace-permission.enum';
import { WorkspacePaymentMethodService } from '../services/workspace-payment-method.service';
import { PaymentMethodCreateDto } from '../dto/payment-method-create.dto';
import { AbstractValidationPipe } from 'src/utils/abstract-validation.pipe';

@Controller('workspace/:workspaceId/payment-methods')
export class WorkspacePaymentMethodController {
  constructor(
    private readonly paymentMethodService: WorkspacePaymentMethodService,
  ) {}

  /**
   * Create a setup intent for adding a payment method.
   * Only owner and admin can add payment methods (ACCESS_BILLING permission).
   */
  @Post('setup-intent')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_BILLING)
  async createSetupIntent(
    @Param('workspaceId') workspaceId: string,
    @GetUser() user: UserEntity,
  ) {
    return this.paymentMethodService.createSetupIntent(workspaceId, user.id);
  }

  /**
   * Attach payment method to workspace after setup intent is confirmed.
   * Only owner and admin can add payment methods (ACCESS_BILLING permission).
   */
  @Post()
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_BILLING)
  @UsePipes(new AbstractValidationPipe(PaymentMethodCreateDto))
  async addPaymentMethod(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: PaymentMethodCreateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.paymentMethodService.attachPaymentMethod(
      workspaceId,
      user.id,
      dto,
    );
  }

  /**
   * Get all payment methods for a workspace.
   * Only owner and admin can view payment methods (ACCESS_BILLING permission).
   */
  @Get()
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_BILLING)
  async getPaymentMethods(@Param('workspaceId') workspaceId: string) {
    return this.paymentMethodService.getPaymentMethods(workspaceId);
  }

  /**
   * Set a payment method as default.
   * Only owner and admin can manage payment methods (ACCESS_BILLING permission).
   */
  @Put(':paymentMethodId/set-default')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_BILLING)
  async setDefaultPaymentMethod(
    @Param('workspaceId') workspaceId: string,
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    return this.paymentMethodService.setDefaultPaymentMethod(
      workspaceId,
      paymentMethodId,
    );
  }

  /**
   * Delete a payment method.
   * Only owner and admin can delete payment methods (ACCESS_BILLING permission).
   */
  @Delete(':paymentMethodId')
  @UseGuards(JwtUserAuthGuard, WorkspacePermissionGuard)
  @RequireWorkspacePermission(WorkspacePermissionEnum.ACCESS_BILLING)
  async deletePaymentMethod(
    @Param('workspaceId') workspaceId: string,
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    await this.paymentMethodService.deletePaymentMethod(
      workspaceId,
      paymentMethodId,
    );
    return { success: true };
  }
}
