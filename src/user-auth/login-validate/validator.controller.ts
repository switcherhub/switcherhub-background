import { Controller, Get, Param } from '@nestjs/common';
import { ValidatorService } from './validator.service';

@Controller('auth/validate')
export class ValidatorController {
  constructor(private readonly validatorService: ValidatorService) {}

  @Get('email/:email')
  async validateLogin(@Param('email') email: string) {
    return await this.validatorService.validateEmail(email);
  }
}
