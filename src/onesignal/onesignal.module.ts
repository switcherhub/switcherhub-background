import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OneSignalService } from './services/onesignal.service';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  // OneSignalService needs access to user.pushNotifications,
  // but importing UsersModule creates module cycles.
  // So we directly import the UserEntity repository.
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [],
  providers: [OneSignalService],
  exports: [OneSignalService],
})
export class OneSignalModule {}
