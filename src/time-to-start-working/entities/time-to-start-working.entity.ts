import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('time_to_start_working')
export class TimeToStartWorkingEntity extends ParameterBaseEntity {}

