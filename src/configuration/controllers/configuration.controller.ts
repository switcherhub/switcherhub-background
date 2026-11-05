import { Controller, Get, Query } from '@nestjs/common';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {
  constructor(
    private readonly configurationService: ConfigurationService,
  ) {}

  @Get()
  async getConfiguration(
    @Query('type') type: string,
    @Query('name') name: string,
  ): Promise<{ data: Record<string, any> | null }> {
    const data = await this.configurationService.getConfiguration(type, name);
    return { data };
  }
}


