import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserListService } from '../services/user-list.service';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserEntity } from 'src/users/entities/user.entity';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { UserListCreateDto } from '../dto/user-list-create.dto';
import { UserListViewService } from '../services/user-list-view.service';

@Controller('user-list')
export class UserListController {
  constructor(
    private readonly userListService: UserListService,
    private readonly userListViewService: UserListViewService,
  ) {}

  @Get()
  @UseGuards(JwtUserAuthGuard)
  async findUserList(@Query() query: any, @GetUser() user: UserEntity) {
    const filter = parseQueryFilters(query);

    return this.userListViewService.findByFiltersUser(filter, user.id);
  }

  @Post()
  @UseGuards(JwtUserAuthGuard)
  async addToUserList(
    @Body() listing: UserListCreateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.userListService.createByUser({
      ...listing,
      userId: user.id,
    });
  }

  @Delete(':id')
  @UseGuards(JwtUserAuthGuard)
  async deleteFromUserList(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ) {
    return this.userListService.deleteByUser(id, user.id);
  }
}
