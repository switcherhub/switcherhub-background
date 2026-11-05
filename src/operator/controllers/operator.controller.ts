import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OperatorService } from '../services/operator.service';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetOperator } from '../decorators/get-operator.decorator';
import { OperatorEntity } from '../entities/operator.entity';
import { Roles } from '../decorators/role.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { OperatorRoleEnum } from '../types/operator-role.enum';
import { ApiKeyGuard } from 'src/app/guards/api-key.guard';
import { OperatorUpdateValidation } from '../validation/operator-update.validation';
import { OperatorCreateValidation } from '../validation/operator-create.validation';

@Controller('operator')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @UseGuards(JwtOperatorAuthGuard)
  @Roles(OperatorRoleEnum.ADMIN, OperatorRoleEnum.EDITOR)
  async getMe(
    @GetOperator() operator: OperatorEntity,
  ): Promise<OperatorEntity> {
    return this.operatorService.findByIdOrFail(operator.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @UseGuards(JwtOperatorAuthGuard)
  @Roles(OperatorRoleEnum.ADMIN, OperatorRoleEnum.EDITOR)
  async find(): Promise<OperatorEntity[]> {
    return this.operatorService.find();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @UseGuards(JwtOperatorAuthGuard)
  @Roles(OperatorRoleEnum.ADMIN, OperatorRoleEnum.EDITOR)
  async findOne(@Param('id') id: string): Promise<OperatorEntity> {
    const operator = await this.operatorService.findByIdOrFail(id);

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    return operator;
  }

  @Delete(':id/delete')
  @UseGuards(RolesGuard)
  @UseGuards(JwtOperatorAuthGuard)
  @Roles(OperatorRoleEnum.ADMIN)
  async delete(@Param('id') id: string): Promise<OperatorEntity> {
    return await this.operatorService.delete(id);
  }

  @Put(':id/restore')
  @UseGuards(RolesGuard)
  @UseGuards(JwtOperatorAuthGuard)
  @Roles(OperatorRoleEnum.ADMIN)
  async restore(@Param('id') id: string): Promise<OperatorEntity> {
    return await this.operatorService.restore(id);
  }

  @Post()
  @Roles(OperatorRoleEnum.ADMIN)
  async create(
    @Body() operator: OperatorCreateValidation,
  ): Promise<OperatorEntity> {
    return this.operatorService.create(operator);
  }

  @Put(':id')
  @Roles(OperatorRoleEnum.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() operator: OperatorUpdateValidation,
  ): Promise<OperatorEntity> {
    return this.operatorService.update(id, operator);
  }

  @Delete('admin/:id/delete')
  @UseGuards(ApiKeyGuard)
  async deleteAdmin(@Param('id') id: string): Promise<OperatorEntity> {
    return await this.operatorService.delete(id, false);
  }
}
