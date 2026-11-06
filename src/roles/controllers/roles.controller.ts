import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RolesService, RoleSearchResult } from '../services/roles.service';
import { ApiKeyGuard } from 'src/app/guards/api-key.guard';

/**
 * Public taxonomy endpoint. Role search is available pre-auth (spec §8.3 GET /roles/search):
 * the main onboarding path derives category from the title, so this must work before login.
 */
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<RoleSearchResult[]> {
    const max = Math.min(Math.max(Number(limit) || 5, 1), 5);
    return this.rolesService.search(q ?? '', max);
  }

  /** Admin: migrate existing resumes to the new taxonomy (spec §13). Dry-run by default. */
  @Post('migrate')
  @UseGuards(ApiKeyGuard)
  async migrate(@Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun !== 'false'; // default true; only "false" writes
    return this.rolesService.migrateResumeTaxonomy(isDryRun);
  }
}
