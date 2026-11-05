import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ResumeApproveDto {
  @IsNotEmpty()
  @IsBoolean()
  isApproved: boolean;
}
