import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('education')
export class EducationEntity extends ParameterBaseEntity {}
