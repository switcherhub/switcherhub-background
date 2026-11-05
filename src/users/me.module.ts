import { Module } from '@nestjs/common';
import { UsersModule } from './users.module';
import { MeController } from './controllers/me.controller';
import { MeService } from './services/me.service';
import { NotificationModule } from 'src/notification/notification.module';
import { SwapRequestModule } from 'src/swap-request/swap-request.module';

@Module({
  imports: [UsersModule, NotificationModule, SwapRequestModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [],
})
export class MeModule {}
