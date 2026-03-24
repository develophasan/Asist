import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AuthorizePaymentDto {
  @IsUUID()
  requestId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
