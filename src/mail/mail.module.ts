import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: false,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
      defaults: {
        from: process.env.MAIL_FROM,
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
