import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('industry')
export class IndustryEntity extends ParameterBaseEntity {}
