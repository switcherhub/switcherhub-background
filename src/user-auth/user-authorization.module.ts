import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './services/authorization.service';
import { ValidatorController } from './login-validate/validator.controller';
import { UserJwtStrategy } from './strategy/user-jwt.strategy';
import { UserAuthService } from './user-auth/user-auth.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailService } from 'src/mail/mail.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthUserController } from './controllers/authorization.controller';
import { RegistrationService } from './controllers/registration.service';
import { ValidatorService } from './login-validate/validator.service';
import { UserLocalStrategy } from './strategy/user-local.strategy';
import { UserAuthEntity } from './user-auth/user-auth.entity';
import { UserBlockedJwtStrategy } from './strategy/user-blocked-jwt.strategy';
import { OptionalUserJwtStrategy } from './strategy/optional-user-jwt.strategy';
import { NotificationModule } from 'src/notification/notification.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAuthEntity, UserEntity]),
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      imports: [],
      useFactory: async () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
      }),
    }),
    // Cycle: UsersModule -> SwapRequestModule -> ChatModule -> UserAuthModule -> UsersModule
    forwardRef(() => UsersModule),
    NotificationModule,
    WorkspaceModule,
  ],
  controllers: [ValidatorController, AuthUserController],
  providers: [
    UserAuthService,
    AuthService,
    UserJwtStrategy,
    UserBlockedJwtStrategy,
    OptionalUserJwtStrategy,
    UserLocalStrategy,
    RegistrationService,
    ValidatorService,
    MailService,
  ],
  exports: [UserAuthService, ValidatorService],
})
export class UserAuthModule {}
