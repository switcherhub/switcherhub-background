import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const isStripeError =
      exception?.type?.includes?.('Stripe') ||
      exception?.constructor?.name?.includes?.('Stripe');
    const status =
      isStripeError
        ? HttpStatus.INTERNAL_SERVER_ERROR
        : exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorResponse: any = { message: 'Internal server error', status: 500 };

    if (exception.response && exception.response instanceof Object) {
      let { message, error, statusCode } = exception.response;

      if (Array.isArray(message)) {
        errorResponse.messages = message;
        message = 'Validation data error';
      }

      errorResponse.message = message;
      errorResponse.status = isStripeError ? status : statusCode;
      errorResponse.error = error;
    }

    console.error(exception);

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((message) => {
          messages.push(message);
        });
      }
      if (error.children && error.children.length > 0) {
        messages.push(...this.formatValidationErrors(error.children));
      }
    });
    return messages;
  }
}
