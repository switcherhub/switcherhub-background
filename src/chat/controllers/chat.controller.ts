import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { MessageCreateDto } from 'src/message/dto/message-create.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { parseQueryFilters } from 'typeorm-dynamic-filters';
import { ChatEntity } from '../entities/chat.entity';
import { MessageService } from 'src/message/services/message.service';
import { ChatUpdateDto } from '../dto/chat-update.dto';
import { ArchiveReasonEnum } from '../types/archive-reason.enum';

@Controller('chat')
@UseGuards(JwtUserAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
  ) {}

  @Post('message')
  async sendMessage(
    @Body() message: MessageCreateDto,
    @GetUser() user: UserEntity,
  ) {
    return this.chatService.sendMessageToChat(
      message.chatId,
      user,
      message,
      false,
      true,
    );
  }

  @Put(':id/archive')
  async archive(
    @Param('id') chatId: string,
    @GetUser() user: UserEntity,
    @Body('reason') reason: ArchiveReasonEnum,
  ): Promise<ChatEntity> {
    if (!Object.values(ArchiveReasonEnum).includes(reason)) {
      throw new BadRequestException(
        `Invalid archive reason should be one of: ${Object.values(ArchiveReasonEnum).join(', ')}`,
      );
    }

    return this.chatService.archiveByUser(chatId, user, reason);
  }

  @Put(':id/restore')
  async restore(
    @Param('id') chatId: string,
    @GetUser() user: UserEntity,
  ): Promise<ChatEntity> {
    return this.chatService.restoreByUser(chatId, user);
  }

  @Delete(':id')
  async delete(
    @Param('id') chatId: string,
    @GetUser() user: UserEntity,
  ): Promise<void> {
    return this.chatService.deleteByUser(chatId, user.id);
  }

  @Get(':type(inbox|sent|archived)')
  async find(
    @Query() query: any,
    @Query('search') search: string,
    @GetUser() user: UserEntity,
    @Param('type') type: 'inbox' | 'sent' | 'archived',
  ): Promise<any> {
    const filter = parseQueryFilters(query);

    const res = await this.chatService.findByFiltersUser(
      filter,
      search,
      type,
      user.id,
      user.activeRole,
    );

    const unreadMessages = await this.chatService.getUnreadMessagesCount(user, {
      ...filter,
      per_page: 1000,
    });

    return {
      ...res,
      chatRequests: unreadMessages,
    };
  }

  @Get('unread')
  async getUnreadChats(
    @Query() query: any,
    @GetUser() user: UserEntity,
  ): Promise<any> {
    const filter = parseQueryFilters(query);
    filter.per_page = 1000;

    return this.chatService.getUnreadMessagesCount(user, filter);
  }

  @Put(':id')
  async update(
    @Body() chat: ChatUpdateDto,
    @GetUser() user: UserInterface,
    @Param('id') chatId: string,
  ) {
    return this.chatService.updateByUser(chatId, user.id, chat);
  }

  @Get(':id')
  async findOne(
    @Param('id') chatId: string,
    @GetUser() user: UserInterface,
  ): Promise<ChatEntity> {
    return this.chatService.findChatWithAccess(chatId, user.id);
  }

  @Get(':id/messages')
  async findMessages(
    @Query() query: any,
    @Param('id') chatId: string,
    @GetUser() user: UserInterface,
  ) {
    const filter = parseQueryFilters(query);
    await this.chatService.findChatWithAccess(chatId, user.id);
    await this.chatService.markMessagesAsRead(chatId, user.id);
    return this.messageService.findByFiltersUser(filter, chatId, user.id);
  }
}
