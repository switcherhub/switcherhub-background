import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('work_environment')
export class WorkEnvironmentEntity extends ParameterBaseEntity {}
