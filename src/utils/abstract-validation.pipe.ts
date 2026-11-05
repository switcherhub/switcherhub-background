import {
  Injectable,
  ValidationPipe,
  ArgumentMetadata,
  Type,
} from '@nestjs/common';

@Injectable()
export class AbstractValidationPipe extends ValidationPipe {
  constructor(private readonly dtoClass: Type<any>) {
    super({ whitelist: true, transform: true });
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.metatype === Object) {
      metadata = { ...metadata, metatype: this.dtoClass };
    }
    return super.transform(value, metadata);
  }
}
