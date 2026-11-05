import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('same_role_count')
export class SameRoleCountEntity extends ParameterBaseEntity {}

