import { TypeOrmModule } from '@nestjs/typeorm';

import { ShiftTypeEntity } from './entities/shift-type.entity';
import { Module } from '@nestjs/common';
import { ShiftTypeService } from './services/shift-type.service';
import { ShiftTypeController } from './controllers/shift-type.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftTypeEntity])],
  controllers: [ShiftTypeController],
  providers: [ShiftTypeService, TypeOrmSelectService],
  exports: [ShiftTypeService],
})
export class ShiftTypeModule {}
