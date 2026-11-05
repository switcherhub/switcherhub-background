import {
  AfterLoad,
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserInterface } from '../interfaces/user.interface';
import { UserAuthEntity } from 'src/user-auth/user-auth/user-auth.entity';
import { UserRoleEnum } from '../interfaces/user-role.enum';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { VacancyEntity } from 'src/vacancy/entities/vacancy.entity';
import { ReportEntity } from 'src/report/entities/report.entity';
import { CompanyEntity } from 'src/company/entities/company.entity';
import { OperatorEntity } from 'src/operator/entities/operator.entity';
import { SubscriptionInterface } from 'src/subscription/types/subscription.interface';
import { SubscriptionEntity } from 'src/subscription/entities/subscription.entity';
import { NotificationEntity } from 'src/notification/entities/notification.entity';
import { UserListEntity } from 'src/user-list/entities/user-list.entity';

@Entity('users')
export class UserEntity extends BaseEntity implements UserInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string | null;

  @Column({ nullable: true })
  lastName: string | null;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'enum', enum: UserRoleEnum, default: UserRoleEnum.SWITCHER })
  activeRole: UserRoleEnum;

  @Column({ nullable: true })
  blockExpireAt: Date | null;

  @Column({ nullable: true })
  blockReason: string | null;

  @ManyToOne(() => OperatorEntity, {
    nullable: true,
    eager: true,
  })
  @JoinColumn()
  blockBy: OperatorEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @Column({ nullable: true })
  codeAuthorization?: string | null;

  @Column({ nullable: true })
  codeEmail?: string | null;

  @Column({ nullable: true })
  newEmail?: string | null;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  appleId: string;

  @Column({ nullable: true })
  facebookId: string;

  @Column({ default: false })
  isRegistered: boolean;

  /** Позначка «акаунт видалено» — вхід (пароль, OAuth, refresh, JWT) заборонено */
  @Column({ default: false })
  isDeleted: boolean;

  @OneToOne(() => UserAuthEntity, (profile) => profile.user, {
    eager: true,
    cascade: ['remove'],
  })
  credentials: UserAuthEntity;

  @OneToMany(() => UserListEntity, (userList) => userList.user, {
    cascade: ['remove'],
  })
  userList: UserListEntity[];

  @OneToMany(() => ResumeEntity, (resume) => resume.user, {
    cascade: ['remove'],
  })
  resumes: ResumeEntity[];

  @OneToMany(() => ReportEntity, (report) => report.user, {
    cascade: ['remove'],
  })
  reports: ReportEntity[];

  @OneToMany(() => VacancyEntity, (vacancy) => vacancy.user, {
    cascade: ['remove'],
  })
  vacancies: VacancyEntity[];

  @OneToMany(() => CompanyEntity, (company) => company.user, {
    cascade: ['remove'],
  })
  companies: CompanyEntity[];

  @Column({ nullable: true })
  resumeCount: number | null;

  @Column({ nullable: true })
  vacanciesCount: number | null;

  @Column({ nullable: true })
  companiesCount: number | null;

  @Column({ nullable: true })
  showContctactsDaily: number | null;

  @Column({ nullable: true })
  chatCountDaily: number | null;

  @Column({ nullable: true })
  appliesCountDaily: number | null;

  @Column({ nullable: true })
  upgradeCount: number | null;

  @OneToMany(() => NotificationEntity, (notification) => notification.user, {
    cascade: ['remove'],
  })
  notifications: NotificationEntity[];

  @ManyToOne(() => SubscriptionEntity, {
    nullable: true,
  })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: SubscriptionInterface;

  @Column({ nullable: true })
  subscriptionId: string | null;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @AfterLoad()
  setRegisteredAtFromCredentials() {
    if (this.credentials) {
      this.isVerified = this.credentials.isVerified;
      this.isPasswordSet = !!this.credentials.password;

      this.credentials = undefined;
    }

    if (this.blockExpireAt) {
      this.isBlocked = this.blockExpireAt > new Date();
      this.isPermanentlyBlocked =
        this.blockExpireAt > new Date('9998-12-31T23:59:59.999Z');
    } else {
      this.isBlocked = false;
      this.isPermanentlyBlocked = false;
    }
  }

  isVerified: boolean;
  isPasswordSet: boolean;
  isBlocked: boolean;
  isPermanentlyBlocked: boolean;
}
