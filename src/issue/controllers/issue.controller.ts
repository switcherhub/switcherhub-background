import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { IssueEntity } from '../entities/issue.entity';
import { IssueCreateDto } from '../dto/issue-create.dto';
import { IssueUpdateDto } from '../dto/issue-update.dto';
import { IssueService } from '../services/issue.service';

export const IssueController = ParameterBaseController(
  IssueEntity,
  IssueCreateDto,
  IssueUpdateDto,
  IssueService,
  'admin/issue',
);
