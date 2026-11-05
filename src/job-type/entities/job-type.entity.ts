import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('job_types')
export class JobTypeEntity extends ParameterBaseEntity {}
