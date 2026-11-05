import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('job_core')
export class JobCoreEntity extends ParameterBaseEntity {}
