import { IsUUID } from 'class-validator';

export class ConfirmCashPaymentDto {
  @IsUUID()
  paymentId!: string;
}
