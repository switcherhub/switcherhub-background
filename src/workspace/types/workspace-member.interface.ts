import { OrganizationRoleEnum } from './organization-role.enum';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { WorkspaceInterface } from './workspace.interface';

export interface WorkspaceMemberInterface {
  id: string;
  workspaceId: string;
  workspace?: WorkspaceInterface;
  userId: string;
  user?: UserInterface;
  role: OrganizationRoleEnum;
  invitedAt: Date;
  joinedAt: Date | null;
  invitedById: string | null;
  invitedBy?: UserInterface | null;
  createdAt: Date;
  updatedAt: Date;
}
