import { Injectable, OnModuleInit } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersionEntity } from '../entities/app-version.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { AppVersionTypeEnum } from '../types/app-version.interface';

@Injectable()
export class AppVersionService extends ParameterBaseService<AppVersionEntity> {
  constructor(
    @InjectRepository(AppVersionEntity)
    repository: Repository<AppVersionEntity>,
    genericSearch: TypeOrmSelectService<AppVersionEntity>,
  ) {
    super(repository, genericSearch);
  }

  async onModuleInit() {
    const iosAppVersion = await this.repository.findOne({
      where: { type: AppVersionTypeEnum.IOS },
    });

    if (!iosAppVersion) {
      await this.create({
        type: AppVersionTypeEnum.IOS,
        minimumRequiredVersion: '0.0.1',
      });
    }

    const androidAppVersion = await this.repository.findOne({
      where: { type: AppVersionTypeEnum.ANDROID },
    });

    if (!androidAppVersion) {
      await this.create({
        type: AppVersionTypeEnum.ANDROID,
        minimumRequiredVersion: '0.0.1',
      });
    }
  }
}
