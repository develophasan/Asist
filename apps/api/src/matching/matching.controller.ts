import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DispatchRequestDto } from './dto/dispatch-request.dto';
import { MatchingService } from './matching.service';
import { RequestStatus } from '../domain/enums/request-status.enum';

@UseGuards(JwtAuthGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('dispatch/:requestId')
  dispatch(
    @CurrentUser() user: JwtUser,
    @Param('requestId') requestId: string,
    @Body() dto: DispatchRequestDto,
  ) {
    return this.matchingService.dispatch(user, requestId, dto.maxDistanceKm);
  }

  @Post('offers/:offerId/accept')
  accept(@CurrentUser() user: JwtUser, @Param('offerId') offerId: string) {
    return this.matchingService.acceptOffer(user, offerId);
  }

  @Get('offers/me')
  myOffers(@CurrentUser() user: JwtUser) {
    return this.matchingService.myOpenOffers(user);
  }

  @Post('location')
  updateLocation(
    @CurrentUser() user: JwtUser,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.matchingService.updateMyLocation(user, body.lat, body.lng);
  }

  @Get('tasks/current')
  myCurrentTask(@CurrentUser() user: JwtUser) {
    return this.matchingService.myCurrentTask(user);
  }

  @Post('tasks/progress')
  progressTask(
    @CurrentUser() user: JwtUser,
    @Body() body: { toStatus: RequestStatus },
  ) {
    return this.matchingService.progressMyTask(user, body.toStatus);
  }
}
