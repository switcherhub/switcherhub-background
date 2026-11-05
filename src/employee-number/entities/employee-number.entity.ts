import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('employee_number')
export class EmployeeNumberEntity extends ParameterBaseEntity {}
