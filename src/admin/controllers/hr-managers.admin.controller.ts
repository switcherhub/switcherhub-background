import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { HrManagerListItemDto } from '../dto/hr-manager-list-item.dto';
import { HrManagersSummaryDto } from '../dto/hr-managers-summary.dto';
import { UpdateHrManagerRoleDto } from '../dto/update-hr-manager-role.dto';
import { UpdateHrManagerDto } from '../dto/update-hr-manager.dto';
import { HrManagersAdminService } from '../services/hr-managers-admin.service';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';

@Controller('admin/hr-managers')
@UseGuards(JwtOperatorAuthGuard)
export class HrManagersAdminController {
  constructor(
    private readonly hrManagersAdminService: HrManagersAdminService,
  ) {}

  @Get('summary')
  async getSummary(): Promise<HrManagersSummaryDto> {
    return this.hrManagersAdminService.getSummary();
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ): Promise<FilterResponseInterface<HrManagerListItemDto>> {
    return this.hrManagersAdminService.findAll(page, perPage, search, role);
  }

  @Put(':memberId/role')
  async updateRole(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateHrManagerRoleDto,
  ): Promise<HrManagerListItemDto> {
    return this.hrManagersAdminService.updateRole(memberId, dto);
  }

  @Put(':userId')
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateHrManagerDto,
  ): Promise<HrManagerListItemDto> {
    return this.hrManagersAdminService.update(userId, dto);
  }

  @Delete(':memberId')
  async removeMember(@Param('memberId') memberId: string): Promise<void> {
    return this.hrManagersAdminService.removeMember(memberId);
  }
}
