import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentEntity } from './entities/consent.entity';

/**
 * Foundation module for the versioned two-sided consent model (spec Slice 1, Phase 2).
 * Services that create/revoke consent and gate employer delivery are added in Phase 5
 * (POST /matches/{id}/authorize). For now this registers the entity so the schema syncs.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ConsentEntity])],
  exports: [TypeOrmModule],
})
export class ConsentModule {}
