import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeletedAccountEmailEntity } from '../entities/deleted-account-email.entity';
import { UserEntity } from '../entities/user.entity';

import { UserCreateValidation } from '../dto/user-create.validation';
import { UserUpdateValidation } from '../dto/user-update.validation';
import { IFilterQuery } from 'typeorm-dynamic-filters';
import { UserInterface } from '../interfaces/user.interface';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { isUUID } from 'class-validator';
import { UserBlockDto } from '../dto/user-block.dto';
import { OperatorService } from 'src/operator/services/operator.service';
import { MailService } from 'src/mail/mail.service';
import { generateRecoveryCode } from 'src/auth/utils/generateRecoveryCode';
import { UserAuthService } from 'src/user-auth/user-auth/user-auth.service';
import { SwapRequestService } from 'src/swap-request/services/swap-request.service';
import { UserRoleEnum } from '../interfaces/user-role.enum';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(DeletedAccountEmailEntity)
    private deletedAccountEmailRepository: Repository<DeletedAccountEmailEntity>,
    private genericSearch: TypeOrmSelectService<UserEntity>,
    private operatorService: OperatorService,
    private readonly mailService: MailService,
    private readonly userAuthService: UserAuthService,
    @Inject(forwardRef(() => SwapRequestService))
    private readonly swapRequestService: SwapRequestService,
  ) {}

  findAll(): Promise<UserEntity[]> {
    return this.userRepository.find();
  }

  async findByFilter(
    filter: IFilterQuery,
    search?: string,
  ): Promise<FilterResponseInterface<UserInterface>> {
    return this.genericSearch.search(
      this.userRepository,
      {
        page: filter.page,
        search,
        searchFields: [],
        orderBy: ['createdAt'],
        orderType: ['DESC'],
        filterBy: filter.filterBy,
        filterType: filter.filterType,
        filterValue: filter.filterValue,
      },
      (builder) => {
        if (search) {
          builder.andWhere(
            `concat_ws(' ', alias.firstName, alias.lastName, alias.email) ILIKE :search`,
            { search: `%${search}%` },
          );
        }
        return builder;
      },
    );
  }

  async findOneOrFail(id: string, relations?: string[]): Promise<UserEntity> {
    if (!isUUID(id)) {
      throw new BadRequestException(`id: ${id} is not a valid UUID`);
    }

    const existed = await this.userRepository.findOne({
      where: { id },
      relations,
    });

    if (!existed) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }

    return existed;
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  normalizeLoginEmail(email: string): string {
    return email.replace(/\s+/g, '').toLowerCase();
  }

  async wasAccountDeletedForEmail(email: string): Promise<boolean> {
    const normalized = this.normalizeLoginEmail(email);
    const row = await this.deletedAccountEmailRepository.findOne({
      where: { email: normalized },
    });
    return !!row;
  }

  async findActiveUserForLogin(email: string): Promise<UserEntity> {
    const normalized = this.normalizeLoginEmail(email);
    const user = await this.userRepository.findOne({
      where: { email: normalized },
    });

    if (user) {
      if (user.isDeleted) {
        throw new BadRequestException('акаунт був видалений');
      }
      return user;
    }
    if (await this.wasAccountDeletedForEmail(normalized)) {
      throw new BadRequestException('Account was deleted');
    }
    throw new BadRequestException(
      'User not found. Please register to continue',
    );
  }

  async create(user: UserCreateValidation): Promise<UserEntity> {
    const newUser = this.userRepository.create(user);

    return await this.userRepository.save(newUser);
  }

  /**
   * Лист на MAIL_USERNAME: користувач підтвердив пароль і просить видалити акаунт (без автоматичного видалення).
   */
  async sendAccountDeletionRequestEmail(userId: string): Promise<void> {
    const user = await this.findOneOrFail(userId);
    const to = process.env.MAIL_USERNAME?.trim();
    if (!to) {
      throw new BadRequestException(
        'MAIL_USERNAME is not configured; cannot send deletion request.',
      );
    }

    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || '—';
    const subject =
      '[SwitcherHub] Запит на видалення акаунта / Account deletion request';

    const html = `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111;">
  <p><strong>Користувач хоче видалити акаунт.</strong></p>
  <p>Користувач підтвердив пароль у застосунку і надіслав запит на видалення облікового запису.</p>
  <table style="border-collapse: collapse; margin-top: 12px;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>ID</strong></td><td>${user.id}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Імʼя</strong></td><td>${escapeHtml(fullName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Email</strong></td><td>${escapeHtml(user.email)}</td></tr>
  </table>
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p><strong>User requested account deletion.</strong></p>
  <p>They confirmed their password in the app.</p>
  <table style="border-collapse: collapse; margin-top: 12px;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>User ID</strong></td><td>${user.id}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Name</strong></td><td>${escapeHtml(fullName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Email</strong></td><td>${escapeHtml(user.email)}</td></tr>
  </table>
</body>
</html>`;

    await this.mailService.sendMail(to, subject, html);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { id } });
    if (!existing) {
      return;
    }

    await this.swapRequestService.cancelOpenSwapRequestsForDeletedUser(id);

    const normalizedEmail = this.normalizeLoginEmail(existing.email);
    await this.deletedAccountEmailRepository.save({
      email: normalizedEmail,
    });

    const tombstone = `deleted.${id}@account-deleted.invalid`;
    const auth = await this.userAuthService.findOneByUserId(id);

    if (auth) {
      auth.email = tombstone;
      auth.refreshToken = null;
      await this.userAuthService.update(auth);
    }

    await this.userRepository.update({ id }, { email: tombstone, isDeleted: true });
    await this.userRepository.softDelete({ id });
  }

  async update(updateUser: UserUpdateValidation): Promise<any> {
    await this.findOneOrFail(updateUser.id);

    await this.userRepository.save(updateUser);

    return this.findOneOrFail(updateUser.id);
  }

  async savePhotoUrlWithUpdateAvatar(path: string, userId: string) {
    const user = await this.findOneOrFail(userId);
    user.avatarUrl = path;
    await this.update(user);
  }

  async delete(id: string): Promise<void> {
    await this.remove(id);
  }

  async confirmCode(
    email: string,
    code: string,
  ): Promise<{
    status: string;
    message: string;
  }> {
    const user = await this.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.codeAuthorization === code) {
      return {
        status: 'success',
        message: 'Code is correct',
      };
    }

    throw new BadRequestException('Code is incorrect');
  }

  async block(id: string, blockDto: UserBlockDto, operatorId: string) {
    const user = await this.findOneOrFail(id);
    user.blockBy = await this.operatorService.findByIdOrFail(operatorId);

    if (!blockDto.days && !blockDto.isPermanent) {
      throw new BadRequestException('Days or isPermanent should be provided');
    }

    if (blockDto.days) {
      user.blockExpireAt = new Date(
        new Date().getTime() + blockDto.days * 24 * 60 * 60 * 1000,
      );
    }

    if (blockDto.isPermanent) {
      user.blockExpireAt = new Date('9999-12-31T23:59:59.999Z');
    }

    user.blockReason = blockDto.blockReason;
    console.log(user.blockExpireAt);
    await this.userRepository.save(user);

    if (blockDto.isPermanent) {
      this.mailService.sendMessagePermanently(user.email);
    } else {
      this.mailService.sendMessageTemporarily(user.email, blockDto.days);
    }

    return this.findOneOrFail(id);
  }

  async unblock(id: string, operatorId: string) {
    const user = await this.findOneOrFail(id);

    user.blockBy = null;
    user.blockExpireAt = null;
    user.blockReason = null;

    await this.userRepository.save(user);

    return this.findOneOrFail(id);
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async updateEmailRequest(
    userId: string,
    newEmail: string,
  ): Promise<UserEntity> {
    const user = await this.findOneOrFail(userId);

    const existingUser = await this.findByEmail(newEmail);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const code = await generateRecoveryCode();

    user.codeEmail = code;
    user.newEmail = newEmail;
    this.mailService.sendChangeEmailCode(newEmail, code);

    await this.userRepository.save(user);

    return this.findOneOrFail(userId);
  }

  async updateEmailConfirm(userId: string, code: string): Promise<UserEntity> {
    const user = await this.findOneOrFail(userId);

    if (user.codeEmail !== code) {
      throw new BadRequestException('Code is incorrect');
    }

    const existingUser = await this.findByEmail(user.newEmail);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const userAuth = await this.userAuthService.findOneByEmail(user.email);

    userAuth.email = user.newEmail;

    await this.userAuthService.update(userAuth);

    user.email = user.newEmail;
    user.newEmail = null;
    user.codeEmail = null;

    await this.userRepository.save(user);

    return this.findOneOrFail(userId);
  }
}
