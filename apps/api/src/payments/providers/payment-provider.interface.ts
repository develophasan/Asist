export interface PaymentProvider {
  authorize(input: {
    amount: number;
    currency: string;
    requestId: string;
    idempotencyKey?: string;
    paymentMethodId?: string;
  }): Promise<{ providerRef: string }>;

  capture(input: {
    providerRef: string;
    idempotencyKey?: string;
  }): Promise<{ providerRef: string }>;
}
