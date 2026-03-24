import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { UserRole } from '../domain/enums/user-role.enum';
import { Payment } from '../database/entities/payment.entity';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { PaymentStatus } from '../domain/enums/payment-status.enum';
import { RequestStatus } from '../domain/enums/request-status.enum';
import { PaymentMethod } from '../domain/enums/payment-method.enum';
import { Assignment } from '../database/entities/assignment.entity';
import { AgentProfile } from '../database/entities/agent-profile.entity';
import { PAYMENT_PROVIDER } from './tokens';
import type { PaymentProvider } from './providers/payment-provider.interface';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(ServiceRequest)
    private readonly requestsRepo: Repository<ServiceRequest>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepo: Repository<Assignment>,
    @InjectRepository(AgentProfile)
    private readonly agentProfilesRepo: Repository<AgentProfile>,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider,
    private readonly stripeProvider: StripePaymentProvider,
  ) {}

  async authorize(
    user: JwtUser,
    input: {
      requestId: string;
      amount: number;
      currency?: string;
      idempotencyKey?: string;
      paymentMethodId?: string;
    },
  ) {
    if (user.role !== UserRole.Customer && user.role !== UserRole.Admin) {
      throw new ForbiddenException('Only customer/admin can authorize payment');
    }
    const request = await this.requestsRepo.findOne({ where: { id: input.requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (user.role === UserRole.Customer && request.userId !== user.sub) {
      throw new ForbiddenException('Request does not belong to customer');
    }

    if (input.idempotencyKey) {
      const existing = await this.paymentsRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }

    const auth = await this.provider.authorize({
      amount: input.amount,
      currency: input.currency ?? 'TRY',
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      paymentMethodId: input.paymentMethodId,
    });
    const payment = this.paymentsRepo.create({
      requestId: input.requestId,
      amount: input.amount.toFixed(2),
      currency: input.currency ?? 'TRY',
      method: PaymentMethod.Card,
      status: PaymentStatus.Authorized,
      providerRef: auth.providerRef,
      idempotencyKey: input.idempotencyKey ?? null,
      customerConfirmedAt: null,
      agentConfirmedAt: null,
    });
    return this.paymentsRepo.save(payment);
  }

  async capture(user: JwtUser, input: { paymentId: string; idempotencyKey?: string }) {
    if (user.role !== UserRole.Admin) {
      throw new ForbiddenException('Only admin can capture payment');
    }
    const payment = await this.paymentsRepo.findOne({ where: { id: input.paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.Captured) return payment;

    if (input.idempotencyKey) {
      const duplicate = await this.paymentsRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey, status: PaymentStatus.Captured },
      });
      if (duplicate) return duplicate;
    }

    await this.provider.capture({
      providerRef: payment.providerRef ?? '',
      idempotencyKey: input.idempotencyKey,
    });
    payment.status = PaymentStatus.Captured;
    if (input.idempotencyKey) payment.idempotencyKey = input.idempotencyKey;
    return this.paymentsRepo.save(payment);
  }

  async listForRequest(user: JwtUser, requestId: string) {
    const request = await this.requestsRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (user.role !== UserRole.Admin && request.userId !== user.sub) {
      throw new ForbiddenException('Request does not belong to user');
    }
    return this.paymentsRepo.find({
      where: { requestId },
      order: { createdAt: 'DESC' },
    });
  }

  async declareCash(
    user: JwtUser,
    input: { requestId: string; amount: number; currency?: string; idempotencyKey?: string },
  ) {
    if (user.role !== UserRole.Customer && user.role !== UserRole.Admin) {
      throw new ForbiddenException('Only customer/admin can declare cash payment');
    }
    const request = await this.requestsRepo.findOne({ where: { id: input.requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (user.role === UserRole.Customer && request.userId !== user.sub) {
      throw new ForbiddenException('Request does not belong to customer');
    }
    if (
      request.status !== RequestStatus.Completed &&
      request.status !== RequestStatus.Closed
    ) {
      throw new ForbiddenException('Cash payment can only be declared after completion');
    }

    if (input.idempotencyKey) {
      const existingByKey = await this.paymentsRepo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existingByKey) return existingByKey;
    }

    const existingCash = await this.paymentsRepo.findOne({
      where: { requestId: input.requestId, method: PaymentMethod.Cash },
      order: { createdAt: 'DESC' },
    });
    if (existingCash) return existingCash;

    const payment = this.paymentsRepo.create({
      requestId: input.requestId,
      amount: input.amount.toFixed(2),
      currency: input.currency ?? 'TRY',
      method: PaymentMethod.Cash,
      status: PaymentStatus.Authorized,
      providerRef: null,
      idempotencyKey: input.idempotencyKey ?? null,
      customerConfirmedAt: null,
      agentConfirmedAt: null,
    });
    return this.paymentsRepo.save(payment);
  }

  async confirmCash(user: JwtUser, paymentId: string) {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.method !== PaymentMethod.Cash) {
      throw new ForbiddenException('Only cash payment can be confirmed here');
    }

    const request = await this.requestsRepo.findOne({ where: { id: payment.requestId } });
    if (!request) throw new NotFoundException('Request not found');

    if (user.role === UserRole.Customer) {
      if (request.userId !== user.sub) {
        throw new ForbiddenException('Request does not belong to customer');
      }
      payment.customerConfirmedAt = payment.customerConfirmedAt ?? new Date();
    } else if (user.role === UserRole.Agent) {
      const agentProfile = await this.agentProfilesRepo.findOne({
        where: { userId: user.sub },
      });
      if (!agentProfile) throw new ForbiddenException('Agent profile not found');
      const assignment = await this.assignmentsRepo.findOne({
        where: { requestId: request.id, agentId: agentProfile.id },
      });
      if (!assignment) throw new ForbiddenException('Agent not assigned to this request');
      payment.agentConfirmedAt = payment.agentConfirmedAt ?? new Date();
    } else if (user.role !== UserRole.Admin) {
      throw new ForbiddenException('Role cannot confirm cash payment');
    }

    if (payment.customerConfirmedAt && payment.agentConfirmedAt) {
      payment.status = PaymentStatus.Captured;
    }
    return this.paymentsRepo.save(payment);
  }

  async handleStripeWebhook(input: { payload: Buffer; signature: string; secret: string }) {
    const event = this.stripeProvider.verifyWebhook(input.payload, input.signature, input.secret);
    if (!event?.type) return { ok: true };

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    if (!paymentIntent?.id) return { ok: true };

    const payment = await this.paymentsRepo.findOne({
      where: { providerRef: paymentIntent.id },
    });
    if (!payment) return { ok: true };

    if (event.type === 'payment_intent.succeeded') {
      payment.status = PaymentStatus.Captured;
      await this.paymentsRepo.save(payment);
    } else if (event.type === 'payment_intent.payment_failed') {
      payment.status = PaymentStatus.Failed;
      await this.paymentsRepo.save(payment);
    }

    return { ok: true };
  }
}
