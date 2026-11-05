import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('shift_type')
export class ShiftTypeEntity extends ParameterBaseEntity {}
