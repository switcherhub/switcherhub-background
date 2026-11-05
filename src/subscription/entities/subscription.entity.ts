import { Column, Entity } from 'typeorm';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { SubscriptionInterface } from '../types/subscription.interface';

@Entity('subscription')
export class SubscriptionEntity
  extends ParameterBaseEntity
  implements SubscriptionInterface
{
  @Column()
  title: string;

  @Column({ default: false })
  isPopular: boolean;

  @Column({
    type: 'enum',
    enum: ['job-seeker', 'employer', 'all'],
    default: 'all',
  })
  type: 'job-seeker' | 'employer' | 'all';

  @Column({ default: 0 })
  resumeCount: number;

  @Column({ default: 0 })
  vacanciesCount: number;

  @Column({ default: 0 })
  companiesCount: number;

  @Column({ default: 0 })
  showContctactsDaily: number;

  @Column({ default: 0 })
  chatCountDaily: number;

  @Column({ default: 0 })
  appliesCountDaily: number;

  @Column({ default: 0 })
  upgradeCount: number;

  @Column({ default: false })
  isFree: boolean;

  @Column({ nullable: true })
  productId: string | null;
}
