import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';

@Entity('company_type')
export class CompanyTypeEntity extends ParameterBaseEntity {}
