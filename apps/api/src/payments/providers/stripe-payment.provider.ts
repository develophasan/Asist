import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe | null;
  private readonly defaultPaymentMethod: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('payment.stripe.secretKey');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
    this.defaultPaymentMethod =
      this.config.get<string>('payment.stripe.defaultPaymentMethod') ?? 'pm_card_visa';
  }

  async authorize(input: {
    amount: number;
    currency: string;
    requestId: string;
    idempotencyKey?: string;
    paymentMethodId?: string;
  }): Promise<{ providerRef: string }> {
    if (!this.stripe) throw new Error('Stripe provider is not configured');
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: Math.round(input.amount * 100),
        currency: input.currency.toLowerCase(),
        capture_method: 'manual',
        confirm: true,
        payment_method: input.paymentMethodId ?? this.defaultPaymentMethod,
        metadata: { requestId: input.requestId },
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );

    return { providerRef: paymentIntent.id };
  }

  async capture(input: {
    providerRef: string;
    idempotencyKey?: string;
  }): Promise<{ providerRef: string }> {
    if (!this.stripe) throw new Error('Stripe provider is not configured');
    const paymentIntent = await this.stripe.paymentIntents.capture(
      input.providerRef,
      {},
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );
    return { providerRef: paymentIntent.id };
  }

  verifyWebhook(payload: Buffer, signature: string, secret: string): Stripe.Event {
    if (!this.stripe) throw new Error('Stripe provider is not configured');
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
