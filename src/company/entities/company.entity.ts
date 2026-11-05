import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationCount,
} from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { CompanyInterface } from '../types/company.interface';
import { IndustryInterface } from 'src/industry/types/industry.interface';
import { IndustryEntity } from 'src/industry/entities/industry.entity';
import { LocationInterface } from 'src/location/types/location.interface';
import { FileEntity } from 'src/file-manager/file/file.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { CompanyTypeInterface } from 'src/company-type/types/company-type.interface';
import { EmployeeNumberInterface } from 'src/employee-number/types/employee-number.interface';
import { FileInterface } from 'src/file-manager/file/file.interface';
import { EmployeeNumberEntity } from 'src/employee-number/entities/employee-number.entity';
import { CompanyTypeEntity } from 'src/company-type/entities/company-type.entity';
import { VacancyEntity } from 'src/vacancy/entities/vacancy.entity';

@Entity('company')
export class CompanyEntity
  extends ParameterBaseEntity
  implements CompanyInterface
{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  registrationNumber: string | null;

  @Column()
  contactPerson: string;

  @Column({ nullable: true })
  establishmentYear: string | null;

  @Column({ nullable: true })
  website: string | null;

  @Column({ type: 'jsonb', default: [] })
  socialNetworks: string[];

  @Column({ nullable: true })
  description: string | null;

  @OneToOne(() => FileEntity, {
    eager: true,
  })
  @JoinColumn({
    name: 'logoId',
  })
  logo: FileEntity;

  @Column({ nullable: true })
  logoId: string | null;

  @ManyToMany(() => FileEntity)
  @JoinTable()
  photos: FileInterface[];

  @Column({ nullable: true })
  contactEmail: string | null;

  @Column({ nullable: true })
  contactPhone: string | null;

  @Column({ default: true })
  isApproved: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @ManyToOne(() => EmployeeNumberEntity, (employeeNumber) => employeeNumber.id)
  @JoinColumn({ name: 'employeeNumberId' })
  employeeNumber: EmployeeNumberEntity | null;

  @Column({ nullable: true })
  employeeNumberId: string | null;

  @ManyToOne(() => CompanyTypeEntity, (company) => company.id)
  @JoinColumn({ name: 'companyTypeId' })
  companyType: CompanyTypeEntity;

  @Column({ nullable: true })
  companyTypeId: string | null;

  @ManyToOne(() => IndustryEntity, (industry) => industry.id)
  @JoinColumn({ name: 'industryId' })
  industry: IndustryEntity;

  @Column({ nullable: true })
  industryId: string | null;

  @Column({ type: 'jsonb', array: false, nullable: true })
  location: LocationInterface | null;

  @ManyToOne(() => UserEntity, (user) => user.resumes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
  })
  user: UserEntity | null;

  @Column({ nullable: true })
  userId: string | null;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => VacancyEntity, (vacancy) => vacancy.company, {
    cascade: ['remove'],
  })
  vacancies: VacancyEntity[];

  @RelationCount((company: CompanyEntity) => company.vacancies)
  vacanciesCount: number;
}
