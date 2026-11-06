import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeComparisonEntity } from './entities/resume-comparison.entity';
import { ResumeComparisonService } from './services/resume-comparison.service';
import { ResumeComparisonController } from './controllers/resume-comparison.controller';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { RoutingMatrixModule } from 'src/routing-matrix/routing-matrix.module';
import { MatchingV2Service } from './matching-v2/matching-v2.service';
import { MatchingV2Controller } from './matching-v2/matching-v2.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeComparisonEntity, ResumeEntity, SwapRequestEntity]),
    ConfigurationModule,
    RoutingMatrixModule,
  ],
  controllers: [ResumeComparisonController, MatchingV2Controller],
  providers: [ResumeComparisonService, MatchingV2Service],
  exports: [ResumeComparisonService, MatchingV2Service],
})
export class ResumeComparisonModule {}

