import { WorkspaceModeEnum } from './workspace-mode.enum';
import { UserInterface } from 'src/users/interfaces/user.interface';

export interface WorkspaceInterface {
  id: string;
  name: string;
  mode: WorkspaceModeEnum;
  ownerId: string;
  owner?: UserInterface;
  createdAt: Date;
  updatedAt: Date;
}
