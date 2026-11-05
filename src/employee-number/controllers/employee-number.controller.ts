import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { EmployeeNumberEntity } from '../entities/employee-number.entity';
import { EmployeeNumberCreateDto } from '../dto/employee-number-create.dto';
import { EmployeeNumberUpdateDto } from '../dto/employee-number-update.dto';
import { EmployeeNumberService } from '../services/employee-number.service';

export const EmployeeNumberController = ParameterBaseController(
  EmployeeNumberEntity,
  EmployeeNumberCreateDto,
  EmployeeNumberUpdateDto,
  EmployeeNumberService,
  'employee-number',
);
