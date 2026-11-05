import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('license_required')
export class LicenseRequiredEntity extends ParameterBaseEntity {}
