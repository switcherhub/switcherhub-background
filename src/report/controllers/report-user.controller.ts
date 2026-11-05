import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ReportUserCreateDto } from '../dto/report-user-create.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { ReportUserService } from '../services/report-user.service';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';

@Controller('report')
@UseGuards(JwtUserAuthGuard)
export class ReportUserController {
  constructor(private readonly reportUserService: ReportUserService) {}

  @Post()
  async create(
    @Body() reportDto: ReportUserCreateDto,
    @GetUser() user: UserInterface,
  ) {
    return this.reportUserService.create(user.id, reportDto);
  }
}
