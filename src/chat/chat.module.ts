import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatEntity } from './entities/chat.entity';
import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './services/chat.service';
import { ChatAdminController } from './controllers/chat.admin.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { ChatController } from './controllers/chat.controller';
import { MessageModule } from 'src/message/message.module';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { UserAuthModule } from 'src/user-auth/user-authorization.module';
import { JwtModule } from '@nestjs/jwt';
import { OneSignalModule } from 'src/onesignal/onesignal.module';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, SwapRequestEntity]),
    MessageModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
      }),
    }),
    forwardRef(() => UserAuthModule),
    OneSignalModule,
  ],
  controllers: [ChatController, ChatAdminController],
  providers: [ChatService, TypeOrmSelectService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
