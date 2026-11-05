import { Controller, Get } from '@nestjs/common';
import { AppVersionService } from '../services/app-version.service';

@Controller('app-version')
export class AppVersionUserController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @Get()
  async findAll() {
    return await this.appVersionService.findAll();
  }
}
