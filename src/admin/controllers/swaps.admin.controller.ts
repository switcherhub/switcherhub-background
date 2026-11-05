import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SwapListItemDto } from '../dto/swap-list-item.dto';
import { SwapsSummaryDto } from '../dto/swaps-summary.dto';
import { SwapsAdminService } from '../services/swaps-admin.service';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';

@Controller('admin/swaps')
@UseGuards(JwtOperatorAuthGuard)
export class SwapsAdminController {
  constructor(private readonly swapsAdminService: SwapsAdminService) {}

  @Get('summary')
  async getSummary(): Promise<SwapsSummaryDto> {
    return this.swapsAdminService.getSummary();
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('search') search?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('tier') tier?: string,
  ): Promise<FilterResponseInterface<SwapListItemDto>> {
    return this.swapsAdminService.findAll(
      page,
      perPage,
      search,
      paymentStatus,
      tier,
    );
  }
}
