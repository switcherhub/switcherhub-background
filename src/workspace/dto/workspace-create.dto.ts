import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WorkspaceModeEnum } from '../types/workspace-mode.enum';

export class WorkspaceCreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(WorkspaceModeEnum)
  mode?: WorkspaceModeEnum = WorkspaceModeEnum.PERSONAL;
}
