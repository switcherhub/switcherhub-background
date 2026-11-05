import { Module } from '@nestjs/common';
import { OperatorController } from './controllers/operator.controller';
import { OperatorService } from './services/operator.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorEntity } from './entities/operator.entity';
import { AuthModule } from 'src/auth/auth.module';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OperatorEntity]), AuthModule],
  controllers: [OperatorController, AdminController],
  providers: [OperatorService],
  exports: [OperatorService],
})
export class OperatorModule {}
