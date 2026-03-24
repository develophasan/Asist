import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { PaymentsService } from './payments.service';
import { AuthorizePaymentDto } from './dto/authorize-payment.dto';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { DeclareCashPaymentDto } from './dto/declare-cash-payment.dto';
import { ConfirmCashPaymentDto } from './dto/confirm-cash-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('authorize')
  authorize(@CurrentUser() user: JwtUser, @Body() dto: AuthorizePaymentDto) {
    return this.paymentsService.authorize(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('capture')
  capture(@CurrentUser() user: JwtUser, @Body() dto: CapturePaymentDto) {
    return this.paymentsService.capture(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cash/declare')
  declareCash(@CurrentUser() user: JwtUser, @Body() dto: DeclareCashPaymentDto) {
    return this.paymentsService.declareCash(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cash/confirm')
  confirmCash(@CurrentUser() user: JwtUser, @Body() dto: ConfirmCashPaymentDto) {
    return this.paymentsService.confirmCash(user, dto.paymentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('request/:requestId')
  listByRequest(@CurrentUser() user: JwtUser, @Param('requestId') requestId: string) {
    return this.paymentsService.listForRequest(user, requestId);
  }

  @Post('webhooks/stripe')
  async stripeWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const secret = this.config.get<string>('payment.stripe.webhookSecret') ?? '';
    if (!signature || !req.rawBody || !secret) {
      throw new BadRequestException('Stripe webhook signature/raw body missing');
    }
    return this.paymentsService.handleStripeWebhook({
      payload: req.rawBody,
      signature,
      secret,
    });
  }
}
