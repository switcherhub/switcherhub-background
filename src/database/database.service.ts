import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AppDataSource } from './config';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    if (!AppDataSource.isInitialized) {
      console.error('❌ AppDataSource is NOT initialized!');
      return;
    }

    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS vacancy_location_point_gist
      ON vacancy
      USING GIST ("locationPoint");
    `);

    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS resume_location_point_gist
      ON resume
      USING GIST ("locationPoint");
    `);

    console.log('✅ Spatial indexes ensured after initialization');
  }
}
