import { TypeOrmModule } from '@nestjs/typeorm';

import { LicenseRequiredEntity } from './entities/license-required.entity';
import { Module } from '@nestjs/common';
import { LicenseRequiredService } from './services/license-required.service';
import { LicenseRequiredController } from './controllers/license-required.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([LicenseRequiredEntity])],
  controllers: [LicenseRequiredController],
  providers: [LicenseRequiredService, TypeOrmSelectService],
  exports: [LicenseRequiredService],
})
export class LicenseRequiredModule {}

