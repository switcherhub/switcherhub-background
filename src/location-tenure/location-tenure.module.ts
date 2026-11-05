import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationTenureEntity } from './entities/location-tenure.entity';
import { Module } from '@nestjs/common';
import { LocationTenureService } from './services/location-tenure.service';
import { LocationTenureController } from './controllers/location-tenure.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocationTenureEntity])],
  controllers: [LocationTenureController],
  providers: [LocationTenureService, TypeOrmSelectService],
  exports: [LocationTenureService],
})
export class LocationTenureModule {}

