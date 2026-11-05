import { Body, Controller, Param, Post } from '@nestjs/common';
import { ParserHandlerService } from '../services/parser-handler.service';
import { ParserWebhookDto } from '../dto/parser-webhook.dto';

@Controller('parser')
export class ParserWebhookController {
  constructor(private readonly parserHandlerService: ParserHandlerService) {}

  @Post('process/:id')
  async processParser(@Param('id') id: string) {
    this.parserHandlerService.processParser(id);

    return {
      message: 'Parser processing started',
      id,
    };
  }

  @Post('webhook')
  async handleWebhook(@Body() body: ParserWebhookDto): Promise<void> {
    return this.parserHandlerService.handleWebhook(body);
  }
}
