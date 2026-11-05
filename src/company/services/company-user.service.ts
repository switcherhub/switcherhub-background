import { UserSubscriptionService } from 'src/users/services/user-subscription.service';
import { ResumeInterface, ResumeKey } from 'src/resume/types/resume.interface';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from '../entities/company.entity';
import { ParameterBaseService } from 'src/parameter/services/parameter.service';
import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
import { CompanyCreateDto } from '../dto/company-create.dto';
import { UserService } from 'src/users/services/user.service';
import { DeleteResult } from 'src/utils/types/delete-result';
import { CompanyService } from './company.service';
import { CompanyUpdateDto } from '../dto/company-update.dto';

@Injectable()
export class CompanyUserService extends ParameterBaseService<CompanyEntity> {
  constructor(
    @InjectRepository(CompanyEntity) repository: Repository<CompanyEntity>,
    genericSearch: TypeOrmSelectService<CompanyEntity>,
    private readonly userService: UserService,
    private readonly companyService: CompanyService,
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {
    super(repository, genericSearch);
  }

  fieldsForApprove: ResumeKey[] = ['title'];

  async updateByUser(
    id: string,
    data: CompanyUpdateDto,
    userId: string,
  ): Promise<CompanyEntity> {
    await this.userService.findOneOrFail(userId);
    await this.companyService.findOneOrFail(id, userId);

    // for (const key in data) {
    //   if (this.fieldsForApprove.includes(key as ResumeKey)) {
    //     data.isApproved = false;
    //     break;
    //   }
    // }

    return this.companyService.updateOne(id, data);
  }

  async createByUser(
    resumeCreateDto: CompanyCreateDto,
    userId: string,
  ): Promise<CompanyEntity> {
    const user = await this.userService.findOneOrFail(userId);

    const limitations =
      await this.userSubscriptionService.findUserLimitations(userId);
    const companiesCount = await this.companyService.countByUser(userId);

    if (companiesCount >= limitations.companiesCount) {
      throw new ForbiddenException(
        `You have reached the maximum number of companies allowed (${limitations.companiesCount}). Please delete an existing resume to create a new one.`,
      );
    }

    resumeCreateDto.user = user;

    return this.create(resumeCreateDto);
  }

  async deleteByUser(id: string, userId: string): Promise<DeleteResult> {
    await this.userService.findOneOrFail(userId);

    return this.companyService.deleteOne(id);
  }
}
