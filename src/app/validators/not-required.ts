import { ValidateIf, ValidationOptions } from 'class-validator';

export function NotRequired(data?: { validationOptions?: ValidationOptions }) {
  return ValidateIf((object, value) => value !== undefined);
}
