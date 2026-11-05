import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { FileInterface } from './file.interface';

export class FileDto implements FileInterface {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  path: string;

  @IsOptional()
  name: string;

  @IsOptional()
  size: number;

  @IsOptional()
  type: string;

  @IsOptional()
  createdAt: Date;

  @IsOptional()
  updatedAt: Date;
}
