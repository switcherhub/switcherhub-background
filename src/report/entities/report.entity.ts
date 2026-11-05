import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { ReportInterface } from '../types/report.interface';
import { ReportTypeInterface } from 'src/report-type/types/report-type.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { UserEntity } from 'src/users/entities/user.entity';
import { ReportTypeEntity } from 'src/report-type/entities/report-type.entity';
import { IssueEntity } from 'src/issue/entities/issue.entity';

@Entity('report')
export class ReportEntity
  extends ParameterBaseEntity
  implements ReportInterface
{
  @ManyToOne(() => ReportTypeEntity, (v) => v.id)
  @JoinColumn({
    name: 'reportTypeId',
  })
  reportType: ReportTypeInterface;

  @Column()
  reportTypeId: string;

  @ManyToOne(() => UserEntity, (user) => user.reports, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
  })
  user: UserInterface;

  @Column()
  userId: string;

  @Column({ nullable: true })
  note: string | null;

  @ManyToOne(() => IssueEntity, (issue) => issue.id)
  @JoinColumn({ name: 'issueId' })
  issue: IssueEntity;

  @Column({ nullable: true })
  issueId: string | null;
}
