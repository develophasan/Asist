import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CreateRequestDto } from './dto/create-request.dto';
import { TransitionRequestStatusDto } from './dto/transition-request-status.dto';
import { RequestsService } from './requests.service';

@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: JwtUser) {
    return this.requestsService.getMine(user);
  }

  @Get(':id/events')
  getEvents(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.requestsService.getEvents(user, id);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRequestDto) {
    return this.requestsService.createRequest(user, dto);
  }

  @Patch(':id/status')
  transitionStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: TransitionRequestStatusDto,
  ) {
    return this.requestsService.transitionStatus(
      user,
      id,
      dto.toStatus,
      dto.note,
    );
  }
}
