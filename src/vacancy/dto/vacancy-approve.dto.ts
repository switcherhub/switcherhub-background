import { IsBoolean, IsNotEmpty } from 'class-validator';

export class VacancyApproveDto {
  @IsNotEmpty()
  @IsBoolean()
  isApproved: boolean;
}
