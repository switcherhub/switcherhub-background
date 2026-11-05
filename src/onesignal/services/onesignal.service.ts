import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class OneSignalService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  private readonly oneSignalUrl = 'https://onesignal.com/api/v1/notifications';
  private readonly appId = process.env.ONESIGNAL_APP_ID;
  private readonly apiKey = process.env.ONESIGNAL_API_KEY;

  async sendPushByExternalId(
    externalId: string,
    title: string,
    body: string,
    type: PushTypeEnum,
    data: any = {},
  ): Promise<any> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: externalId },
      });

      if (!user) {
        throw new NotFoundException(`User not found id=${externalId}`);
      }

      if (!user.pushNotifications) {
        return;
      }

      const payload = {
        app_id: this.appId,
        headings: { en: title },
        contents: { en: body },
        include_external_user_ids: [externalId],
        data,
      };

      const headers = {
        Authorization: `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      const response = await axios.post(this.oneSignalUrl, payload, {
        headers,
      });

      console.log(`Push sent to ${externalId}:`, response.data);
      return response.data;
    } catch (error) {
      //   this.logger.error(`Push failed: ${error.message}`);
      throw error;
    }
  }
}

export enum PushTypeEnum {
  NEW_REQUEST = 'new_request',
  NEW_MESSAGE = 'new_message',
  SYSTEM = 'system',
}
