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
import { GetOperator } from 'src/operator/decorators/get-operator.decorator';
import { OperatorEntity } from 'src/operator/entities/operator.entity';
import { UserAdminUpdateValidation } from 'src/users/dto/user-admin-update.validation';
import { UserBlockDto } from 'src/users/dto/user-block.dto';

import { UserInterface } from 'src/users/interfaces/user.interface';
import { UserService } from 'src/users/services/user.service';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';

@Controller('admin/users')
@UseGuards(JwtOperatorAuthGuard)
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async find(
    @Query('search') search: string,
    @Query() query: any,
  ): Promise<FilterResponseInterface<UserInterface>> {
    const filter = parseQueryFilters(query);

    return this.userService.findByFilter(filter, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserInterface> {
    return this.userService.findOneOrFail(id);
  }

  @Put(':id/block')
  async block(
    @Param('id') id: string,
    @Body() blockDto: UserBlockDto,
    @GetOperator() operator: OperatorEntity,
  ): Promise<UserInterface> {
    return this.userService.block(id, blockDto, operator.id);
  }

  @Put(':id/unblock')
  async unblock(
    @Param('id') id: string,
    @GetOperator() operator: OperatorEntity,
  ): Promise<UserInterface> {
    return this.userService.unblock(id, operator.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() user: UserAdminUpdateValidation,
  ): Promise<UserInterface> {
    return this.userService.update({
      id,
      ...user,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
