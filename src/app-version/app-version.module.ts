import { TypeOrmModule } from '@nestjs/typeorm';

import { AppVersionEntity } from './entities/app-version.entity';
import { Module } from '@nestjs/common';
import { AppVersionService } from './services/app-version.service';
import { AppVersionController } from './controllers/app-version.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { AppVersionUserController } from './controllers/app-version.user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppVersionEntity])],
  controllers: [AppVersionController, AppVersionUserController],
  providers: [AppVersionService, TypeOrmSelectService],
  exports: [AppVersionService],
})
export class AppVersionModule {}
