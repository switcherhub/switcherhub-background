import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceAcceptInvitationDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}
