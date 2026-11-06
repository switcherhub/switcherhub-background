import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentEntity } from './entities/consent.entity';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { ConsentService } from './consent.service';

/**
 * Versioned two-sided consent model (spec Slice 1, Phase 5). Registers the Consent
 * entity (schema syncs) and ConsentService (authorize/withdraw/status + bothAuthorized
 * gate helper). Reads SwapRequestEntity to resolve participants and the current version.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ConsentEntity, SwapRequestEntity])],
  providers: [ConsentService],
  exports: [ConsentService, TypeOrmModule],
})
export class ConsentModule {}
