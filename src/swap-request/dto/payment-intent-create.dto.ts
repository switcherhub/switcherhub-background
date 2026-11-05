import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PaymentIntentCreateDto {
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string; // ID платіжного методу з організації (workspace payment method ID)
}
