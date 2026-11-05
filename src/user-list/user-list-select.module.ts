import { TypeOrmModule } from '@nestjs/typeorm';

import { UserListEntity } from './entities/user-list.entity';
import { Module } from '@nestjs/common';
import { UserListSelectService } from './services/user-list-select.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserListEntity])],
  controllers: [],
  providers: [UserListSelectService],
  exports: [UserListSelectService],
})
export class UserListSelectModule {}
