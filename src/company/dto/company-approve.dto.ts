import { IsBoolean, IsNotEmpty } from 'class-validator';

export class CompanyApproveDto {
  @IsNotEmpty()
  @IsBoolean()
  isApproved: boolean;
}
