import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../database/entities/assignment.entity';
import { AgentProfile } from '../database/entities/agent-profile.entity';
import { Payment } from '../database/entities/payment.entity';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { LocalPaymentProvider } from './providers/local-payment.provider';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { PAYMENT_PROVIDER } from './tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, ServiceRequest, Assignment, AgentProfile]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    LocalPaymentProvider,
    StripePaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, LocalPaymentProvider, StripePaymentProvider],
      useFactory: (
        config: ConfigService,
        localProvider: LocalPaymentProvider,
        stripeProvider: StripePaymentProvider,
      ) => {
        const provider = config.get<string>('payment.provider') ?? 'local';
        return provider === 'stripe' ? stripeProvider : localProvider;
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
