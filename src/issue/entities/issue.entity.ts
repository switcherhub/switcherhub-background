import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  RelationCount,
} from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import {
  EntityTypeEnum,
  IssueInterface,
  IssueStatusEnum,
} from '../types/issue.interface';
import { UserEntity } from 'src/users/entities/user.entity';
import { ReportEntity } from 'src/report/entities/report.entity';

@Entity('issue')
export class IssueEntity extends ParameterBaseEntity implements IssueInterface {
  @Column()
  entityName: string;

  @Column()
  entityId: string;

  @Column({ type: 'enum', enum: EntityTypeEnum })
  entityType: EntityTypeEnum;

  @Column({ nullable: true })
  note: string | null;

  @ManyToOne(() => UserEntity, (user) => user.resumes)
  @JoinColumn({
    name: 'managerId',
  })
  manager: UserEntity;

  @Column({ nullable: true })
  managerId: string;

  @Column({ type: 'enum', enum: IssueStatusEnum, default: IssueStatusEnum.NEW })
  status: IssueStatusEnum;

  @OneToMany(() => ReportEntity, (report) => report.issue, { eager: true })
  reports: ReportEntity[];

  @RelationCount((issue: IssueEntity) => issue.reports)
  reportsCount: number;
}
