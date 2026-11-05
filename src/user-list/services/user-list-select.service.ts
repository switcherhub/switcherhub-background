import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserListEntity } from '../entities/user-list.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ListTypeEnum } from '../types/list-type.enum';

@Injectable()
export class UserListSelectService {
  constructor(
    @InjectRepository(UserListEntity)
    private readonly userListRepository: Repository<UserListEntity>,
  ) {}

  async findIdsByType(
    type: ListTypeEnum,
    userId: string,
  ): Promise<UserListEntity[]> {
    return this.userListRepository.find({
      where: {
        type,
        userId,
      },
    });
  }

  async findByEntityId(entityId: string, userId: string) {
    return this.userListRepository.find({
      where: {
        entityId,
        userId,
      },
    });
  }
}
