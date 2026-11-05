import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { ResumeService } from '../services/resume.service';
import { ResumeInterface } from '../types/resume.interface';
import { ResumeCreateDto } from '../dto/resume-create.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserEntity } from 'src/users/entities/user.entity';
import { ResumeUserService } from '../services/resume-user.service';
import { ResumeDeleteDto } from '../dto/resume-delete.dto';
import { ResumeUpdateDto } from '../dto/resume-update.dto';
import { UserResumeList } from 'src/users/interfaces/user-resume-list.type';
import { OptionalJwtUserAuthGuard } from 'src/user-auth/guards/optional-jwt-user-auth.guard';
import { ResumeMockService } from '../services/resume-mock.service';
import { assertNotFabricatingInProd } from '../../app/feature-flags';

@Controller('resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly resumeUserService: ResumeUserService,
    private readonly resumeMockService: ResumeMockService,
  ) {}

  @Get('search/authorized')
  @UseGuards(JwtUserAuthGuard)
  async searchAuthorized(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius: number,
    @Query('hlng') hlng: number,
    @Query('hlat') hlat: number,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);

    filter.filterBy.push('isHidden');
    filter.filterType.push('eq');
    filter.filterValue.push('false');

    return this.resumeService.findByFiltersOverwrite(
      filter,
      {
        search,
        searchFields: [],
      },
      user,
      lat,
      lng,
      radius,
      hlng,
      hlat,
    );
  }

  @Get('search')
  async search(
    @Query() query: any,
    @Query('search') search: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius: number,
    @Query('hlng') hlng: number,
    @Query('hlat') hlat: number,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);

    filter.filterBy.push('isHidden');
    filter.filterType.push('eq');
    filter.filterValue.push('false');

    return this.resumeService.findByFiltersOverwrite(
      filter,
      {
        search,
        searchFields: [],
      },
      undefined,
      lat,
      lng,
      radius,
      hlng,
      hlat,
    );
  }

  @Get('list/:list')
  @UseGuards(JwtUserAuthGuard)
  async findUserList(
    @GetUser() user: UserEntity,
    @Param('list') list: UserResumeList,
  ) {
    return this.resumeUserService.findUserList(user.id, list);
  }

  @Put('list/:list/:id')
  @UseGuards(JwtUserAuthGuard)
  async addToUserList(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Param('list') list: UserResumeList,
  ) {
    return this.resumeUserService.addToUserList(id, user.id, list);
  }

  @Delete('list/:list/:id')
  @UseGuards(JwtUserAuthGuard)
  async deleteFromUserList(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Param('list') list: UserResumeList,
  ) {
    return this.resumeUserService.deleteFromUserList(id, user.id, list);
  }

  @Get()
  @UseGuards(JwtUserAuthGuard)
  async find(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
  ): Promise<FilterResponseInterface<ResumeInterface>> {
    const filter = parseQueryFilters(query);

    return this.resumeService.findByFiltersOverwrite(
      filter,
      {
        search,
        searchFields: [],
      },
      user,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      true,
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtUserAuthGuard)
  async findOne(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Req() req: Request,
  ): Promise<ResumeInterface> {
    const fingerprint = req.headers['x-fingerprint'];

    return this.resumeService.findOne(id, fingerprint, user?.id);
  }

  @Post()
  @UseGuards(JwtUserAuthGuard)
  async create(
    @Body() resume: ResumeCreateDto,
    @GetUser() user: UserInterface,
  ): Promise<ResumeInterface> {
    return this.resumeUserService.createByUser(resume, user.id);
  }

  @Post('mock')
  @UseGuards(JwtUserAuthGuard)
  async createMock(@GetUser() user: UserInterface): Promise<ResumeInterface> {
    // Truthful Data: fabricated resumes are blocked unless DEMO_MODE is on.
    assertNotFabricatingInProd('resume.createMock');
    const mockResume = await this.resumeMockService.generateMockResume();
    return this.resumeUserService.createByUser(mockResume, user.id);
  }

  @Put(':id/visible')
  @UseGuards(JwtUserAuthGuard)
  async setVisible(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
    @Body('isHidden') isHidden: boolean,
  ): Promise<ResumeInterface> {
    return this.resumeUserService.setVisibility(id, user.id, isHidden);
  }
  @Patch(':id/recalculate-commute')
  @UseGuards(JwtUserAuthGuard)
  async recalculateCommute(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ): Promise<ResumeInterface> {
    return this.resumeUserService.recalculateCommuteByUser(id, user.id);
  }

  @Put(':id')
  @UseGuards(JwtUserAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() data: ResumeUpdateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.resumeUserService.updateByUser(id, data, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtUserAuthGuard)
  async delete(
    @Param('id') id: string,
    @Body() body: ResumeDeleteDto,
    @GetUser() user: UserInterface,
  ) {
    return this.resumeUserService.deleteByUser(id, user.id, body.noteDeletion);
  }
}
