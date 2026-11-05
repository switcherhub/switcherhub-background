import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeeNumberEntity } from './entities/employee-number.entity';
import { Module } from '@nestjs/common';
import { EmployeeNumberService } from './services/employee-number.service';
import { EmployeeNumberController } from './controllers/employee-number.controller';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeNumberEntity])],
  controllers: [EmployeeNumberController],
  providers: [EmployeeNumberService, TypeOrmSelectService],
  exports: [EmployeeNumberService],
})
export class EmployeeNumberModule {}
