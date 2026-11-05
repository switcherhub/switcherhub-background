import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { PerkInterface } from '../types/perk.interface';

@Entity('perk')
export class PerkEntity extends ParameterBaseEntity implements PerkInterface {}
