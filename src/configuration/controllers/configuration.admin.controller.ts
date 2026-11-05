import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtOperatorAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationEntity } from '../entities/configuration.entity';

@Controller('admin/configuration')
@UseGuards(JwtOperatorAuthGuard)
export class ConfigurationAdminController {
  constructor(
    private readonly configurationService: ConfigurationService,
  ) {}

  @Get()
  async getAll(
    @Query('type') type?: string,
  ): Promise<ConfigurationEntity[]> {
    if (type) {
      return this.configurationService.getConfigurationsByType(type);
    }
    return this.configurationService.getAllConfigurations();
  }

  @Get('get')
  async getConfiguration(
    @Query('type') type: string,
    @Query('name') name: string,
  ): Promise<{ data: Record<string, any> | null }> {
    const data = await this.configurationService.getConfiguration(type, name);
    return { data };
  }

  @Post()
  async setConfiguration(
    @Body()
    body: {
      type: string;
      name: string;
      data: Record<string, any>;
    },
  ): Promise<ConfigurationEntity> {
    return this.configurationService.setConfiguration(
      body.type,
      body.name,
      body.data,
    );
  }

  @Put()
  async updateConfiguration(
    @Body()
    body: {
      type: string;
      name: string;
      data: Record<string, any>;
    },
  ): Promise<ConfigurationEntity> {
    return this.configurationService.setConfiguration(
      body.type,
      body.name,
      body.data,
    );
  }

  @Put('field')
  async updateField(
    @Body()
    body: {
      type: string;
      name: string;
      field: string;
      value: any;
    },
  ): Promise<ConfigurationEntity> {
    return this.configurationService.updateConfigurationField(
      body.type,
      body.name,
      body.field,
      body.value,
    );
  }

  @Delete()
  async deleteConfiguration(
    @Query('type') type: string,
    @Query('name') name: string,
  ): Promise<{ message: string }> {
    await this.configurationService.deleteConfiguration(type, name);
    return { message: 'Configuration deleted successfully' };
  }
}


