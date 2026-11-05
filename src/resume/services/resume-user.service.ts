import { ResumeKey } from 'src/resume/types/resume.interface';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from '../entities/resume.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { ResumeCreateDto } from '../dto/resume-create.dto';
import { UserService } from 'src/users/services/user.service';
import { ResumeService } from './resume.service';
import { ResumeUpdateDto } from '../dto/resume-update.dto';
import { mapUserResumeList } from '../maps/mapSearchedResume';
import {
  listRelations,
  USER_RESUME_LISTS,
  UserResumeList,
} from 'src/users/interfaces/user-resume-list.type';
import { UserSubscriptionService } from 'src/users/services/user-subscription.service';

@Injectable()
export class ResumeUserService extends ParameterBaseService<ResumeEntity> {
  constructor(
    @InjectRepository(ResumeEntity) repository: Repository<ResumeEntity>,
    genericSearch: TypeOrmSelectService<ResumeEntity>,
    private readonly userService: UserService,
    private readonly resumeService: ResumeService,
    private readonly userSubscritionService: UserSubscriptionService,
  ) {
    super(repository, genericSearch);
  }

  async onModuleInit() {
    // this.checkAvailableCount('342e8499-d2ca-4aa0-a1d3-bd0c1056b719');
  }

  fieldsForApprove: ResumeKey[] = ['title'];

  async updateByUser(
    id: string,
    data: ResumeUpdateDto,
    userId: string,
  ): Promise<ResumeEntity> {
    await this.userService.findOneOrFail(userId);
    await this.resumeService.findOneOrFail(id, userId);

    // for (const key in data) {
    //   if (this.fieldsForApprove.includes(key as ResumeKey)) {
    //     data.isApproved = false;
    //     break;
    //   }
    // }

    return this.resumeService.updateOne(id, data);
  }

  async createByUser(
    resumeCreateDto: ResumeCreateDto,
    userId: string,
  ): Promise<ResumeEntity> {
    const user = await this.userService.findOneOrFail(userId, ['subscription']);
    const limitations =
      await this.userSubscritionService.findUserLimitations(userId);
    const resumeCount = await this.resumeService.countByUser(userId);
    const isSubscribed = user.subscription && !user.subscription.isFree;

    if (resumeCount >= limitations.resumeCount) {
      throw new ForbiddenException(
        `You have reached the maximum number of resumes allowed (${limitations.resumeCount}). Please delete an existing resume to create a new one.`,
      );
    }

    resumeCreateDto.user = user;
    resumeCreateDto.isHidden = false;

    return this.resumeService.create(resumeCreateDto);
  }

  /** Деактивація резюме (isActive = false), без soft-delete рядка */
  async deleteByUser(
    id: string,
    userId: string,
    noteDeletion: string,
  ): Promise<ResumeEntity> {
    await this.userService.findOneOrFail(userId);
    const resume = await this.resumeService.findOneOrFail(id, userId);

    if (resume.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this resume',
      );
    }

    return this.resumeService.save(id, {
      noteDeletion,
      isActive: false,
      isHidden: true,
    });
  }

  async findUserList(userId: string, relation: UserResumeList) {
    const user = await this.userService.findOneOrFail(userId, [
      ...USER_RESUME_LISTS,
      ...listRelations(relation),
    ]);

    return mapUserResumeList(user[relation], user);
  }

  async addToUserList(id: string, userId: string, relation: UserResumeList) {
    const resume = await this.findOneOrFail(id);
    const user = await this.userService.findOneOrFail(userId, [relation]);

    if (!user[relation].includes(resume)) {
      user[relation].push(resume);
      await this.userService.update(user);
    }

    return this.findUserList(userId, relation);
  }

  async deleteFromUserList(
    id: string,
    userId: string,
    relation: UserResumeList,
  ) {
    const user = await this.userService.findOneOrFail(userId, [relation]);

    user[relation] = user[relation].filter((f) => f.id !== id);

    await this.userService.update(user);

    return this.findUserList(userId, relation);
  }

  async setVisibility(
    id: string,
    userId: string,
    isHidden: boolean,
  ): Promise<ResumeEntity> {
    const user = await this.userService.findOneOrFail(userId, ['subscription']);
    const isSubscribed = user.subscription && !user.subscription.isFree;

    if (isHidden === false) {
      const limimtations =
        await this.userSubscritionService.findUserLimitations(userId);

      const visibleCount = await this.findVisibleCount(userId);

      if (visibleCount >= limimtations.resumeCount) {
        throw new ForbiddenException(
          `You have reached the maximum number of visible resumes allowed (${limimtations.resumeCount})`,
        );
      }
    }

    const resume = await this.resumeService.findOneOrFail(id, userId);

    if (resume.userId !== userId) {
      throw new ForbiddenException(
        `You do not have permission to update this resume`,
      );
    }

    if (!resume.isActive) {
      throw new BadRequestException(
        'Cannot change visibility of a deactivated resume. Restore it first.',
      );
    }

    resume.isHidden = isHidden;

    return this.resumeService.save(id, resume);
  }

  async recalculateCommuteByUser(
    id: string,
    userId: string,
  ): Promise<ResumeEntity> {
    await this.resumeService.findOneOrFail(id, userId);
    return this.resumeService.recalculateCommute(id);
  }

  async findVisibleCount(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        isHidden: false,
        isApproved: true,
        isActive: true,
      },
    });
  }

  async checkAvailableCount(userId: string): Promise<boolean> {
    const limitations =
      await this.userSubscritionService.findUserLimitations(userId);
    const user = await this.userService.findOneOrFail(userId, [
      'resumes',
      'subscription',
    ]);
    const isSubscribed = !!(user.subscription && !user.subscription.isFree);

    const approved = user.resumes
      .filter((v) => v.isApproved && v.isActive)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const allowedVisible = approved
      .filter((v) => v.isApproved && !v.isHidden)
      .slice(0, limitations.resumeCount);
    const allowedIds = new Set(allowedVisible.map((v) => v.id));
    console.log('Allowed IDs:', allowedIds);

    const toUpdate = [];

    for (const resume of user.resumes) {
      if (!resume.isActive) {
        resume.isHidden = true;
        toUpdate.push(resume);
        continue;
      }
      if (allowedIds.has(resume.id)) {
        console.log('Allow:', resume.id);
        resume.isHidden = false;
      } else {
        console.log('Hide:', resume.id);
        resume.isHidden = true;
      }

      toUpdate.push(resume);
    }

    console.log('Subscription:', limitations.resumeCount, isSubscribed);
    console.log(
      toUpdate.map((v) => ({
        isHidden: v.isHidden,
      })),
    );

    await this.repository.save(toUpdate);

    return true;
  }
}
