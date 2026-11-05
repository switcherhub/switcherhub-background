import { BadRequestException, Injectable } from '@nestjs/common';
import { IssueService } from 'src/issue/services/issue.service';
import { ReportUserCreateDto } from '../dto/report-user-create.dto';
import { IssueCreateDto } from 'src/issue/dto/issue-create.dto';
import {
  EntityTypeEnum,
  IssueStatusEnum,
} from 'src/issue/types/issue.interface';
import { ReportService } from './report.service';

@Injectable()
export class ReportUserService {
  constructor(
    private readonly issueService: IssueService,
    private readonly reportService: ReportService,
  ) {}

  async create(userId: string, reportDto: ReportUserCreateDto) {
    const existedReport = await this.reportService.findOne(
      userId,
      reportDto.entityId,
    );

    if (existedReport) {
      throw new BadRequestException('Report already exists');
    }

    let issue = await this.issueService.findByEntity(reportDto.entityId);

    if (!issue) {
      const createDto: IssueCreateDto = {
        entityName: reportDto.entityName,
        entityId: reportDto.entityId,
        entityType: reportDto.entityType,
        note: null,
        managerId: null,
        status: IssueStatusEnum.NEW,
        title: '',
        isHidden: false,
        id: undefined,
        order: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        deletedAt: undefined,
        manager: undefined,
        reports: undefined,
      };

      issue = await this.issueService.create(createDto);
    }

    return this.reportService.create({
      ...reportDto,
      userId,
      issueId: issue.id,
    });
  }
}
