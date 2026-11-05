import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { SafeTypeOrmLogger } from './logger';

const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const dbPassword = process.env.DB_PASSWORD;
if (typeof dbPassword !== 'string') {
  throw new Error(
    'DB_PASSWORD is not set. Ensure .env exists in the project root and pm2 cwd points to switcherhub-backend.',
  );
}

const isProd = process.env.DEPLOYMENT_MODE === 'prod';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: dbPassword,
  database: process.env.DB_NAME,

  entities: [path.join(__dirname, '/../**/*.entity.{js,ts}')],

  synchronize: true,

  logger: new SafeTypeOrmLogger(),
  logging: true,
  extra: {
    max: 10,
  },

  ...(isProd && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});
