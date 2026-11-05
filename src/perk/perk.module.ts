import { TypeOrmModule } from '@nestjs/typeorm';

import { PerkEntity } from './entities/perk.entity';
import { Module } from '@nestjs/common';
import { PerkService } from './services/perk.service';
import { PerkController } from './controllers/perk.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([PerkEntity])],
  controllers: [PerkController],
  providers: [PerkService, TypeOrmSelectService],
  exports: [PerkService],
})
export class PerkModule {}
