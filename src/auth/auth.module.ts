import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot(),
    PassportModule,
    JwtModule.registerAsync({
      imports: [],
      useFactory: async () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
