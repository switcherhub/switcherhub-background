import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config';
import { CredentialsEntity } from 'src/auth/entities/credentials.entity';
import { OperatorEntity } from 'src/operator/entities/operator.entity';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(AppDataSource.options),
    TypeOrmModule.forFeature([CredentialsEntity, OperatorEntity]),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
