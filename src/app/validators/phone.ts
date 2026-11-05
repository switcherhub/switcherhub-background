import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments) {
    const regex = /^\+\d+$/;
    return regex.test(phoneNumber);
  }

  defaultMessage(args: ValidationArguments) {
    return 'The phone number must begin with “+” and contain only digits.';
  }
}

export function IsValidPhoneNumber() {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: { message: 'Incorrect phone number' },
      validator: IsValidPhoneNumberConstraint,
    });
  };
}
