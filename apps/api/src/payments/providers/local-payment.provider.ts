import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class LocalPaymentProvider implements PaymentProvider {
  async authorize(input: {
    amount: number;
    currency: string;
    requestId: string;
    idempotencyKey?: string;
    paymentMethodId?: string;
  }): Promise<{ providerRef: string }> {
    void input;
    return { providerRef: `local-auth-${randomUUID()}` };
  }

  async capture(input: {
    providerRef: string;
    idempotencyKey?: string;
  }): Promise<{ providerRef: string }> {
    return { providerRef: input.providerRef };
  }
}
