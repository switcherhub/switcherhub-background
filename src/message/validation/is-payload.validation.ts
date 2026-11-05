import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  isVacancyPayload,
  isResumePayload,
  isImagePayload,
  isFilePayload,
} from './payload-type-guards';

export function IsValidPayload(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPayload',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === null) return true;
          return (
            isVacancyPayload(value) ||
            isResumePayload(value) ||
            isImagePayload(value) ||
            isFilePayload(value)
          );
        },
      },
    });
  };
}
