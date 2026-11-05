import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { NotificationInterface } from '../types/notification.interface';

@Controller('notification')
@UseGuards(JwtUserAuthGuard)
export class NotificationUserController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async find(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
  ): Promise<FilterResponseInterface<NotificationInterface>> {
    const filter = parseQueryFilters(query);

    return this.notificationService.findByFiltersOverwrite(
      filter,
      {
        search,
        searchFields: ['title'],
      },
      user.id,
    );
  }

  @Put('read-all')
  async readAllNotifications(@GetUser() user: UserEntity) {
    return this.notificationService.readAllNotifications(user.id);
  }

  @Put(':id/read')
  async readOneNotification(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ) {
    return this.notificationService.readOneNotification(id, user.id);
  }
}
