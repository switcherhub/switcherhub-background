import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsTrulyEmpty(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTrulyEmpty',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return value === undefined;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be undefined`;
        },
      },
    });
  };
}
