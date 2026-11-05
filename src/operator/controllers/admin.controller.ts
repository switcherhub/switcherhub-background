import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OperatorCreateByAdminValidation } from '../validation/operator-create-by-admin.validation';
import { OperatorService } from '../services/operator.service';
import { OperatorEntity } from '../entities/operator.entity';
import { ApiKeyGuard } from 'src/app/guards/api-key.guard';

@Controller('admin')
@UseGuards(ApiKeyGuard)
export class AdminController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post()
  async createOperator(
    @Body() operator: OperatorCreateByAdminValidation,
  ): Promise<OperatorEntity> {
    return this.operatorService.createByAdmin(operator);
  }
}
