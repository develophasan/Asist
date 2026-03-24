import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CapturePaymentDto {
  @IsUUID()
  paymentId!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
