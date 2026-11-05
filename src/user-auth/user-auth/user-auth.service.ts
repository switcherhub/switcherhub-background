import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { UserAuthCreateDto, UserAuthUpdateDto } from './user-auth.dto';
import { UserAuthEntity } from './user-auth.entity';
import { NotificationService } from 'src/notification/services/notification.service';
import { NotificationTypeEnum } from 'src/notification/types/notification-type.enum';

@Injectable()
export class UserAuthService {
  constructor(
    @InjectRepository(UserAuthEntity)
    private readonly repository: Repository<UserAuthEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  async find(): Promise<UserAuthEntity[]> {
    return await this.repository.find();
  }

  async findUserByAuthId(authId: string): Promise<UserEntity> {
    const user = await this.repository.findOne({
      where: { id: authId },
      relations: ['user'],
    });

    if (!user?.user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.user.isDeleted) {
      throw new UnauthorizedException('акаунт був видалений');
    }

    return user.user;
  }

  async findOneByUserId(userId: string): Promise<UserAuthEntity | null> {
    return await this.repository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<UserAuthEntity> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findOneByEmail(email: string): Promise<UserAuthEntity> {
    return await this.repository.findOne({
      where: { email },
      relations: ['user'],
    });
  }

  async findOneByRefreshToken(refreshToken: string): Promise<UserAuthEntity | null> {
    return await this.repository.findOne({
      where: { refreshToken },
      relations: ['user'],
    });
  }

  async findUserWithReffered(userId: string): Promise<UserAuthEntity> {
    return await this.repository.findOne({
      where: { id: userId },
      relations: ['referredBy'],
    });
  }

  async create(user: UserAuthCreateDto): Promise<UserAuthEntity> {
    const saved = await this.repository.save(user);

    await this.notificationService.newNotification({
      type: NotificationTypeEnum.WELCOME_MESSAGE,
      userId: saved.user.id,
    });

    return saved;
  }

  async update(user: UserAuthUpdateDto): Promise<UserAuthEntity> {
    return await this.repository.save(user);
  }

  async remove(id: string) {
    return await this.repository.delete(id);
  }

  async findUserByToken(token: string): Promise<UserEntity> {
    const user = await this.repository.findOne({
      where: { refreshToken: token },
      relations: ['user'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user.user;
  }

  // async getHashedPassword(id: string) {
  //   const user = await this.repository.findOne({
  //     where: { id },
  //   });

  //   if (!user) {
  //     throw new UnauthorizedException('User not found');
  //   }

  //   return user.credentials.password;
  // }
}
