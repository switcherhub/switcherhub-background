import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('location_tenure')
export class LocationTenureEntity extends ParameterBaseEntity {}
