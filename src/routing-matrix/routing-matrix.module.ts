import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoutingMatrixService } from './services/routing-matrix.service';
import { SwitcherHubRoutingProvider } from './providers/switcherhub-routing.provider';
import { TomTomRoutingProvider } from './providers/tomtom-routing.provider';
import { MapboxRoutingProvider } from './providers/mapbox-routing.provider';
import { RoutingCacheService } from './services/routing-cache.service';

@Module({
  imports: [ConfigModule],
  providers: [
    RoutingMatrixService,
    SwitcherHubRoutingProvider,
    TomTomRoutingProvider,
    MapboxRoutingProvider,
    RoutingCacheService,
  ],
  exports: [RoutingMatrixService],
})
export class RoutingMatrixModule {}

