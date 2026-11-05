import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationEntity } from './entities/notification.entity';
import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { NotificationUserController } from './controllers/notification-user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  controllers: [NotificationUserController],
  providers: [NotificationService, TypeOrmSelectService],
  exports: [NotificationService],
})
export class NotificationModule {}
