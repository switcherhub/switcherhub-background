import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageEntity } from './entities/message.entity';
import { Module } from '@nestjs/common';
import { MessageService } from './services/message.service';
import { MessageController } from './controllers/message.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [MessageController],
  providers: [MessageService, TypeOrmSelectService],
  exports: [MessageService],
})
export class MessageModule {}
