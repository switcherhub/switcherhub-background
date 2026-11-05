import { Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { ReportTypeInterface } from '../types/report-type.interface';

@Entity('report_type')
export class ReportTypeEntity extends ParameterBaseEntity implements ReportTypeInterface {}
