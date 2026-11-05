import { Module } from '@nestjs/common';
import { RoutingMatrixModule } from 'src/routing-matrix/routing-matrix.module';
import { GeocodingService } from './services/geocoding.service';
import { CommuteController } from './controllers/commute.controller';

@Module({
  imports: [RoutingMatrixModule],
  controllers: [CommuteController],
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class CommuteModule {}
