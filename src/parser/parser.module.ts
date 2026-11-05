import { TypeOrmModule } from '@nestjs/typeorm';

import { ParserEntity } from './entities/parser.entity';
import { Module } from '@nestjs/common';
import { ParserService } from './services/parser.service';
import { ParserController } from './controllers/parser.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { ParserHandlerService } from './services/parser-handler.service';
import { ParserWebhookController } from './controllers/parser-webhook.controller';
import { VacancyModule } from 'src/vacancy/vacancy.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParserEntity]), VacancyModule],
  controllers: [ParserWebhookController, ParserController],
  providers: [ParserService, ParserHandlerService, TypeOrmSelectService],
  exports: [ParserService],
})
export class ParserModule {}
