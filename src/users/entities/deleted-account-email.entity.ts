import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('deleted_account_emails')
export class DeletedAccountEmailEntity {
  @PrimaryColumn()
  email: string;

  @CreateDateColumn()
  recordedAt: Date;
}
