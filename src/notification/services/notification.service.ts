import { NotificationTypeEnum } from 'src/notification/types/notification-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { NotificationCreateDto } from '../dto/notification-create.dto';
import {
  SearchFilterInterface,
  FilterResponseInterface,
} from 'src/utils/filter-response.interface';
import { IFilterQuery } from 'typeorm-dynamic-filters';

@Injectable()
export class NotificationService extends ParameterBaseService<NotificationEntity> {
  constructor(
    @InjectRepository(NotificationEntity)
    repository: Repository<NotificationEntity>,
    genericSearch: TypeOrmSelectService<NotificationEntity>,
  ) {
    super(repository, genericSearch);
  }

  getMessage(type: NotificationTypeEnum): string {
    switch (type) {
      case NotificationTypeEnum.WELCOME_MESSAGE:
        return 'Start exploring new job opportunities tailored just for you.';
      case NotificationTypeEnum.SWAP_HR_JOINED:
        return "The counterpart's HR has joined the deal.";
      case NotificationTypeEnum.SWAP_HR_CONFIRMED:
        return "The counterpart's HR has confirmed participation in the deal.";
      case NotificationTypeEnum.SWAP_HR_PAID:
        return "The counterpart's HR has made the payment.";
      case NotificationTypeEnum.SWAP_DEAL_COMPLETED:
        return 'The deal has been completed.';
      default:
        return 'You have a new notification.';
    }
  }

  getTitle(type: NotificationTypeEnum): string {
    switch (type) {
      case NotificationTypeEnum.WELCOME_MESSAGE:
        return 'Welcome to SwitcherHub!';
      case NotificationTypeEnum.SWAP_HR_JOINED:
        return "Counterpart's HR joined";
      case NotificationTypeEnum.SWAP_HR_CONFIRMED:
        return "Counterpart's HR confirmed participation";
      case NotificationTypeEnum.SWAP_HR_PAID:
        return "Counterpart's HR has paid";
      case NotificationTypeEnum.SWAP_DEAL_COMPLETED:
        return 'Deal completed';
      default:
        return 'Notification';
    }
  }

  async unreadCount(userId: string): Promise<number> {
    const count = await this.repository.count({
      where: {
        userId,
        isRead: false,
      },
    });

    console.log('Unread notifications count:', count);

    return count;
  }

  async newNotification(
    notification: NotificationCreateDto,
  ): Promise<NotificationEntity> {
    try {
      return await this.create({
        ...notification,
        isRead: false,
      });
    } catch (error) {
      console.error('Error creating notification:', {
        type: notification.type,
        userId: notification.userId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async readAllNotifications(userId: string): Promise<void> {
    await this.repository
      .createQueryBuilder('notification')
      .update()
      .set({ isRead: true })
      .where('userId = :userId', { userId })
      .execute();
  }

  async readOneNotification(
    id: string,
    userId: string,
  ): Promise<NotificationEntity> {
    const notification = await this.repository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return this.repository.save({ ...notification, isRead: true });
  }

  async findByFiltersOverwrite(
    filter: IFilterQuery,
    searchFilter: SearchFilterInterface,
    userId: string,
  ): Promise<FilterResponseInterface<NotificationEntity>> {
    const data = await this.findByFilters(
      filter,
      {
        search: searchFilter.search,
        searchFields: searchFilter.searchFields,
        withDeleted: searchFilter.withDeleted,
        relations: [],
      },
      (builder) => {
        builder
          .andWhere(`alias.userId = :userId`, { userId })
          .andWhere(`alias.createdAt >= :startDate`, {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          })
          .orderBy('alias.createdAt', 'DESC');

        return builder;
      },
    );

    return {
      ...data,
      data: data.data.map((item) => ({
        ...item,
        message: this.getMessage(item.type),
        title: this.getTitle(item.type),
      })),
    };
  }
}
