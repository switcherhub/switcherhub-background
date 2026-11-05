import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ResumeInterface } from 'src/resume/types/resume.interface';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { SearchViewService } from '../services/search-view.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchViewService: SearchViewService) {}

  @Get('authorized')
  @UseGuards(JwtUserAuthGuard)
  async searchAuthorized(
    @Query() query: any,
    @Query('search') search: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius: number,
    @Query('hlng') hlng: number,
    @Query('hlat') hlat: number,
    @Query('type') type: 'all' | 'vacancy' | 'switcher',
    @Query('map') mapDataFormat: boolean,
    @GetUser() user: UserEntity,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);

    // filter.filterBy.push('isHidden');
    // filter.filterType.push('eq');
    // filter.filterValue.push('false');

    const per_page = query.per_page;

    filter.per_page = per_page
      ? Number(per_page)
      : mapDataFormat
        ? 1000
        : Number(per_page);

    return this.searchViewService.findByFiltersOverwrite(
      filter,
      {
        search,
        searchFields: ['title'],
      },
      user.id,
      lat,
      lng,
      radius,
      hlng,
      hlat,
      type,
      mapDataFormat,
    );
  }

  @Get()
  async search(
    @Query() query: any,
    @Query('search') search: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius: number,
    @Query('hlng') hlng: number,
    @Query('hlat') hlat: number,
    @Query('type') type: 'all' | 'vacancy' | 'switcher',
    @Query('map') mapDataFormat: boolean,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);

    // filter.filterBy.push('isHidden');
    // filter.filterType.push('eq');
    // filter.filterValue.push('false');

    const per_page = query.per_page;

    filter.per_page = per_page
      ? Number(per_page)
      : mapDataFormat
        ? 1000
        : Number(per_page);

    return this.searchViewService.findByFiltersOverwrite(
      filter,
      {
        search,
        searchFields: ['title'],
      },
      undefined,
      lat,
      lng,
      radius,
      hlng,
      hlat,
      type,
      mapDataFormat,
    );
  }
}
