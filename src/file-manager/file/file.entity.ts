import {
  AfterLoad,
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FileInterface } from './file.interface';
import * as p from 'path';

@Entity('files')
export class FileEntity extends BaseEntity implements FileInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  path: string;

  @Column()
  name: string;

  @Column()
  size: number;

  @Column()
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @CreateDateColumn()
  updatedAt: Date;

  url: string;

  @AfterLoad()
  fullUrl() {
    const baseUrl = process.env.FILE_BASE_URL || '';
    this.url = new URL(this.path, baseUrl).href;
  }
}
