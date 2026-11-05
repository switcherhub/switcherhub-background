import { BadRequestException } from '@nestjs/common';
import { SalaryPeriodEnum } from './salary.enum';
import { getEnumValues } from 'src/utils/getEnumValues';

export function getSalaryMultiplier(type: SalaryPeriodEnum): number {
  switch (type) {
    case SalaryPeriodEnum.HOURLY:
      return 1;
    // case SalaryPeriodEnum.DAILY:
    //   return 8;
    // case SalaryPeriodEnum.WEEKLY:
    //   return 40;
    // case SalaryPeriodEnum.MONTHLY:
    //   return 160;
    case SalaryPeriodEnum.YEARLY:
      return 1920;
    default:
      throw new BadRequestException(
        `salaryPeriod must be ${getEnumValues(SalaryPeriodEnum).join(',')}`,
      );
  }
}
