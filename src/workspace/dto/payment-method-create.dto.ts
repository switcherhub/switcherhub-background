import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentMethodCreateDto {
  @IsNotEmpty()
  @IsString()
  setupIntentId: string;
}
