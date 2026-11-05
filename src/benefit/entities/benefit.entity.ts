import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { BenefitInterface } from '../types/benefit.interface';

@Entity('benefit')
export class BenefitEntity extends ParameterBaseEntity implements BenefitInterface {}
