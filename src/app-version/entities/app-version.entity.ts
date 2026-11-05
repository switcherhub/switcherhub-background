import { Column, Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import {
  AppVersionInterface,
  AppVersionTypeEnum,
} from '../types/app-version.interface';

@Entity('app_version')
export class AppVersionEntity
  extends ParameterBaseEntity
  implements AppVersionInterface
{
  @Column({
    default: '1.0.0',
  })
  minimumRequiredVersion: string;

  @Column({
    enum: AppVersionTypeEnum,
    type: 'enum',
  })
  type: AppVersionTypeEnum;
}
