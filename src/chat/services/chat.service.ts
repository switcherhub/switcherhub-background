import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, MoreThan, Repository } from 'typeorm';
import { ChatEntity } from '../entities/chat.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { MessageService } from 'src/message/services/message.service';
import { MessageSendDto } from 'src/message/dto/message-create.dto';
import { MessageTypeEnum } from 'src/message/types/message-type.enum';
import { FilterBuilder, IFilterQuery } from 'typeorm-dynamic-filters';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { ChatUpdateDto } from '../dto/chat-update.dto';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ArchiveReasonEnum } from '../types/archive-reason.enum';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import {
  OneSignalService,
  PushTypeEnum,
} from 'src/onesignal/services/onesignal.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ChatService extends ParameterBaseService<ChatEntity> {
  constructor(
    @InjectRepository(ChatEntity) repository: Repository<ChatEntity>,
    genericSearch: TypeOrmSelectService<ChatEntity>,
    private readonly messageService: MessageService,
    private readonly chatGateway: ChatGateway,
    private readonly onesignalService: OneSignalService,
  ) {
    super(repository, genericSearch);
  }

  async sendMessageToChat(
    chatId: string,
    user: UserEntity,
    message: MessageSendDto,
    force: boolean = false,
    notification: boolean = true,
  ): Promise<void> {
    const chat = await this.findOneOrFail(chatId);

    if (!chat || (chat.ownerId !== user.id && chat.participantId !== user.id)) {
      throw new BadRequestException('Chat not found');
    }

    // Для swap-request чату учасники — це owner та participant (два світчери); доступ уже перевірено вище

    if ((chat.archiveReasonOwner || chat.archiveReasonParticipant) && !force) {
      throw new BadRequestException('Chat is archived');
    }

    const isOwner = chat.ownerId === user.id;

    message.chatId = chatId;
    message.userId = user.id;

    isOwner
      ? (chat.participantUreadMessagesCount += 1)
      : (chat.ownerUreadMessagesCount += 1);

    chat.lastMessageText = message.text;
    chat.lastMessageAt = new Date().toISOString();

    await this.messageService.create(message);

    await this.chatGateway.sendToUsers(
      [chat.participantId, chat.ownerId],
      'message',
      {
        ...message,
        chatId,
        userId: user.id,
      },
    );

    if (notification) {
      await this.onesignalService.sendPushByExternalId(
        chat.ownerId === user.id ? chat.participantId : chat.ownerId,
        'New message',
        message.text,
        PushTypeEnum.NEW_MESSAGE,
        {
          chatId,
        },
      );
    }

    await this.save(chatId, chat);
  }

  /**
   * Надсилає системне повідомлення в чат (без відправника-користувача, без push).
   * Використовується для етапів swap-request (підтвердження, контакти, ейчар тощо).
   */
  async sendSystemMessageToChat(chatId: string, text: string): Promise<void> {
    const chat = await this.findOneOrFail(chatId);

    if (chat.archiveReasonOwner || chat.archiveReasonParticipant) {
      return;
    }

    const message: MessageSendDto = {
      type: MessageTypeEnum.SYSTEM,
      text,
      chatId,
      payload: undefined,
      userId: chat.ownerId,
    };

    chat.ownerUreadMessagesCount += 1;
    chat.participantUreadMessagesCount += 1;
    chat.lastMessageText = text;
    chat.lastMessageAt = new Date().toISOString();

    await this.messageService.create(message);

    await this.chatGateway.sendToUsers(
      [chat.participantId, chat.ownerId],
      'message',
      {
        ...message,
        chatId,
        userId: chat.ownerId,
      },
    );

    await this.save(chatId, chat);
  }

  async findByFiltersUser(
    filter: IFilterQuery,
    search: string,
    type: 'inbox' | 'sent' | 'archived',
    userId: string,
    accountType: UserRoleEnum,
  ): Promise<FilterResponseInterface<ChatEntity>> {
    const res = await this.findByFilters(
      filter,
      {
        search,
        searchFields: ['title'],
      },
      (builder) => {
        builder
          .withDeleted()
          .leftJoinAndSelect('alias.targetSwapRequest', 'targetSwapRequest');

        if (type === 'sent') {
          builder.andWhere(
            'alias.ownerId = :userId AND alias.archiveReasonOwner IS NULL AND alias.archiveReasonParticipant IS NULL AND alias.deletedAtOwner IS NULL AND alias.ownerAccountType = :ownerAccountType',
            { userId, ownerAccountType: accountType },
          );
        }

        if (type === 'inbox') {
          builder.andWhere(
            'alias.participantId = :userId AND alias.archiveReasonOwner IS NULL AND alias.archiveReasonParticipant IS NULL  AND alias.deletedAtParticipant IS NULL AND alias.participantAccountType = :participantAccountType',
            { userId, participantAccountType: accountType },
          );
        }

        if (type === 'archived') {
          builder.andWhere(
            new Brackets((qb) => {
              qb.where(
                new Brackets((qb2) => {
                  qb2
                    .where(
                      'alias.ownerId = :userId AND alias.deletedAtOwner IS NULL AND alias.ownerAccountType = :ownerAccountType',
                      {
                        userId,
                        ownerAccountType: accountType,
                      },
                    )
                    .orWhere(
                      'alias.participantId = :userId AND alias.deletedAtParticipant IS NULL AND alias.participantAccountType = :participantAccountType',
                      {
                        userId,
                        participantAccountType: accountType,
                      },
                    );
                }),
              ).andWhere(
                new Brackets((qb3) => {
                  qb3
                    .where('alias.archiveReasonOwner IS NOT NULL')
                    .orWhere('alias.archiveReasonParticipant IS NOT NULL');
                }),
              );
            }),
          );
        }

        return builder;
      },
    );

    res.data = res.data.map((chat) => {
      chat['unreadMessagesCount'] =
        chat.ownerId === userId
          ? chat.ownerUreadMessagesCount
          : chat.participantUreadMessagesCount;

      return chat;
    });

    return res;
  }

  async findChatWithAccess(
    chatId: string,
    userId: string,
  ): Promise<ChatEntity> {
    const chat = await this.findOneOrFail(chatId, undefined, [
      'targetSwapRequest',
    ]);

    if (!chat || (chat.ownerId !== userId && chat.participantId !== userId)) {
      throw new ForbiddenException('Access denied to this chat');
    }

    chat['unreadMessagesCount'] =
      chat.ownerId === userId
        ? chat.ownerUreadMessagesCount
        : chat.participantUreadMessagesCount;

    return chat;
  }

  async getUnreadMessagesCount(
    user: UserEntity,
    filter: IFilterQuery,
  ): Promise<{
    total: {
      inbox: number;
      sent: number;
      archived: number;
    };
    unreadMessages: {
      inbox: number;
      sent: number;
      archived: number;
    };
  }> {
    const filterBuilder = new FilterBuilder(this.repository, 'alias');
    let queryBuilder = filterBuilder.build(filter);

    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where(
          new Brackets((q) => {
            q.where('alias.ownerId = :userId', { userId: user.id })
              .andWhere('alias."ownerAccountType"::text = :role', {
                role: user.activeRole,
              })

              .andWhere('alias.deletedAtOwner IS NULL');
          }),
        ).orWhere(
          new Brackets((q) => {
            q.where('alias.participantId = :userId', { userId: user.id })
              .andWhere('alias."participantAccountType"::text = :role', {
                role: user.activeRole,
              })
              .andWhere('alias.deletedAtParticipant IS NULL');
          }),
        );
      }),
    );

    queryBuilder.select([
      'alias.ownerUreadMessagesCount',
      'alias.participantUreadMessagesCount',
      'alias.ownerId',
      'alias.participantId',
      'alias.archiveReasonOwner',
      'alias.archiveReasonParticipant',
    ]);

    const chats = await queryBuilder.getMany();

    const unreadMessages = {
      inbox: 0,
      sent: 0,
      archived: 0,
    };

    const total = {
      inbox: 0,
      sent: 0,
      archived: 0,
    };

    chats.forEach((chat) => {
      console.log('Processing chat:', chat);
      const type = this.getChatType(chat, user.id);
      console.log(`Chat type: ${type}`);
      unreadMessages[type] +=
        chat.ownerId === user.id
          ? chat.ownerUreadMessagesCount
          : chat.participantUreadMessagesCount;

      total[type] += 1;
    });

    return {
      unreadMessages,
      total,
    };
  }

  /** Загальна кількість непрочитаних повідомлень у чатах користувача (тільки swap-request чати). */
  async getTotalUnreadMessagesCount(user: UserEntity): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('alias')
      .where(
        new Brackets((qb) => {
          qb.where(
            new Brackets((q) => {
              q.where('alias.ownerId = :userId')
                .andWhere('alias."ownerAccountType"::text = :role')
                .andWhere('alias.deletedAtOwner IS NULL');
            }),
          ).orWhere(
            new Brackets((q) => {
              q.where('alias.participantId = :userId')
                .andWhere('alias."participantAccountType"::text = :role')
                .andWhere('alias.deletedAtParticipant IS NULL');
            }),
          );
        }),
        { userId: user.id, role: user.activeRole },
      )
      .select([
        'alias.id',
        'alias.ownerId',
        'alias.participantId',
        'alias.ownerUreadMessagesCount',
        'alias.participantUreadMessagesCount',
      ]);
    const chats = await qb.getMany();
    return chats.reduce(
      (sum, chat) =>
        sum +
        (chat.ownerId === user.id
          ? chat.ownerUreadMessagesCount
          : chat.participantUreadMessagesCount),
      0,
    );
  }

  /** Список swap-request чатів з кількістю непрочитаних для користувача (для розбивки по табах). Логіка як у списку: ownerId/participantId + ownerUreadMessagesCount/participantUreadMessagesCount, без фільтра по ролі. */
  async getChatsWithUnreadForUser(
    userId: string,
    _accountType?: UserRoleEnum,
  ): Promise<{ swapRequestId: string; unreadCount: number }[]> {
    const qb = this.repository
      .createQueryBuilder('alias')
      .where('alias.targetSwapRequestId IS NOT NULL')
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((q) => {
              q.where('alias.ownerId = :userId').andWhere(
                'alias.deletedAtOwner IS NULL',
              );
            }),
          ).orWhere(
            new Brackets((q) => {
              q.where('alias.participantId = :userId').andWhere(
                'alias.deletedAtParticipant IS NULL',
              );
            }),
          );
        }),
        { userId },
      )
      .select([
        'alias.id',
        'alias.targetSwapRequestId',
        'alias.ownerId',
        'alias.participantId',
        'alias.ownerUreadMessagesCount',
        'alias.participantUreadMessagesCount',
      ]);
    const chats = await qb.getMany();
    return chats
      .map((chat) => ({
        swapRequestId: chat.targetSwapRequestId!,
        unreadCount:
          chat.ownerId === userId
            ? chat.ownerUreadMessagesCount
            : chat.participantUreadMessagesCount,
      }))
      .filter((x) => x.unreadCount > 0);
  }

  getChatType(chat: ChatEntity, userId: string): 'inbox' | 'sent' | 'archived' {
    if (chat.archiveReasonOwner || chat.archiveReasonParticipant) {
      return 'archived';
    }

    if (chat.ownerId === userId) {
      return 'sent';
    } else if (chat.participantId === userId) {
      return 'inbox';
    }
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const chat = await this.findOneOrFail(chatId);

    if (chat.ownerId === userId) {
      chat.ownerUreadMessagesCount = 0;
    } else if (chat.participantId === userId) {
      chat.participantUreadMessagesCount = 0;
    } else {
      throw new ForbiddenException('Access denied to mark messages as read');
    }

    await this.save(chatId, chat);
  }

  async updateByUser(
    chatId: string,
    userId: string,
    chat: ChatUpdateDto,
  ): Promise<ChatEntity> {
    const existingChat = await this.findOneOrFail(chatId);

    if (
      existingChat.ownerId !== userId &&
      existingChat.participantId !== userId
    ) {
      throw new ForbiddenException('Access denied to update this chat');
    }

    if (existingChat.ownerId == userId && chat.archiveReasonParticipant) {
      throw new BadRequestException('You cannot archive chat as owner');
    }

    if (existingChat.participantId == userId && chat.archiveReasonOwner) {
      throw new BadRequestException('You cannot archive chat as participant');
    }

    return this.save(chatId, {
      ...chat,
    });
  }

  async deleteByUser(chatId: string, userId: string): Promise<void> {
    const chat = await this.findChatWithAccess(chatId, userId);

    if (chat.ownerId === userId) {
      chat.deletedAtOwner = new Date();
    } else {
      chat.deletedAtParticipant = new Date();
    }

    await this.save(chatId, chat);

    this.chatGateway.sendToUsers(
      [chat.participantId, chat.ownerId],
      'chatDeleted',
      chat,
    );
  }

  async archiveByUser(
    chatId: string,
    user: UserEntity,
    reason: ArchiveReasonEnum,
  ): Promise<ChatEntity> {
    const chat = await this.findChatWithAccess(chatId, user.id);

    if (chat.ownerId == user.id) {
      chat.archiveReasonOwner = reason;
    } else {
      chat.archiveReasonParticipant = reason;
    }

    this.chatGateway.sendToUsers(
      [chat.participantId, chat.ownerId],
      'chatArchived',
      chat,
    );

    await this.sendMessageToChat(
      chatId,
      user,
      {
        type: MessageTypeEnum.TEXT,
        text: `Request archived — chat unavailable`,
        chatId,
        payload: undefined,
        userId: user.id,
      },
      true,
      false,
    );

    return this.save(chatId, {
      archiveReasonOwner: chat.archiveReasonOwner,
      archiveReasonParticipant: chat.archiveReasonParticipant,
      autoDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  async restoreByUser(chatId: string, user: UserEntity): Promise<ChatEntity> {
    const chat = await this.findChatWithAccess(chatId, user.id);

    if (
      (chat.ownerId == user.id && chat.archiveReasonParticipant) ||
      (chat.participantId == user.id && chat.archiveReasonOwner)
    ) {
      throw new BadRequestException(
        'You cannot restore an active chat that was archived by the other user',
      );
    }

    if (chat.ownerId == user.id) {
      chat.archiveReasonOwner = null;
    } else {
      chat.archiveReasonParticipant = null;
    }

    await this.sendMessageToChat(
      chatId,
      user,
      {
        type: MessageTypeEnum.TEXT,
        text: `Request restored — chat available`,
        chatId,
        payload: undefined,
        userId: user.id,
      },
      true,
    );

    return this.save(chatId, {
      archiveReasonOwner: chat.archiveReasonOwner,
      archiveReasonParticipant: chat.archiveReasonParticipant,
      autoDeleteAt: null,
    });
  }

  /** Створює чат між двома користувачами (світчерами) і прив'язує до swap-request. */
  async createSwapRequestChat(
    swapRequestId: string,
    ownerId: string,
    participantId: string,
  ): Promise<ChatEntity> {
    const existingChat = await this.repository.findOne({
      where: { targetSwapRequestId: swapRequestId },
    });

    if (existingChat) {
      return existingChat;
    }

    const userRepository = this.repository.manager.getRepository('UserEntity');
    const [owner, participant] = await Promise.all([
      userRepository.findOne({ where: { id: ownerId } }),
      userRepository.findOne({ where: { id: participantId } }),
    ]);

    if (!owner || !participant) {
      throw new BadRequestException('Users not found');
    }

    const chat = this.repository.create({
      ownerId,
      participantId,
      ownerAccountType: (owner as any).accountType ?? UserRoleEnum.CANDIDATE,
      participantAccountType:
        (participant as any).accountType ?? UserRoleEnum.CANDIDATE,
      targetSwapRequestId: swapRequestId,
    });

    return await this.repository.save(chat);
  }

  async getSwapRequestChat(swapRequestId: string): Promise<ChatEntity | null> {
    return await this.repository.findOne({
      where: { targetSwapRequestId: swapRequestId },
      relations: ['owner', 'participant'],
    });
  }

  @Cron('0 0 * * *')
  async deleteArchivedChats(): Promise<void> {
    const chats = await this.repository.find({
      where: {
        autoDeleteAt: MoreThan(new Date()),
      },
    });

    if (chats.length > 1) {
      console.log(`Found ${chats.length} chats to delete`);
    } else {
      console.log(`No chats to delete`);
    }

    for (const chat of chats) {
      if (chat.autoDeleteAt && new Date(chat.autoDeleteAt) < new Date()) {
        console.log(
          `Deleting chat with ID: ${chat.id} - ${chat.autoDeleteAt.toDateString()}`,
        );
        await this.repository.delete(chat.id);
      }
    }
  }
}
