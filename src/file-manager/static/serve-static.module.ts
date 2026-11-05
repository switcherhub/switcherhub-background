import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: './uploads',
      serveRoot: '/uploads',
    }),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  exports: [ServeStaticModule],
})
export class StaticModule {}
