import { getSalaryMultiplier } from './getSalary';
import { SalaryPeriodEnum } from './salary.enum';

export function convertSalary(
  from: SalaryPeriodEnum,
  to: SalaryPeriodEnum,
  salary: number,
): number {
  if (!salary) return null;

  const multiplier = getSalaryMultiplier(to) / getSalaryMultiplier(from);

  if (to === SalaryPeriodEnum.HOURLY) {
    return customRound(salary * multiplier, 100000);
  } else {
    return customRound(salary * multiplier, 1);
  }
}

function customRound(value: number, precesition: number): number {
  return Math.round(value * precesition) / precesition;
}
