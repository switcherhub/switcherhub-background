import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationService } from './services/configuration.service';
import { ScoringHelperService } from './services/scoring-helper.service';
import { ConfigurationController } from './controllers/configuration.controller';
import { ConfigurationAdminController } from './controllers/configuration.admin.controller';
import { ConfigurationEntity } from './entities/configuration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfigurationEntity])],
  controllers: [ConfigurationController, ConfigurationAdminController],
  providers: [ConfigurationService, ScoringHelperService],
  exports: [ConfigurationService, ScoringHelperService],
})
export class ConfigurationModule {}

