import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';

import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(user, dto);
  }

  @Get('mine')
  getMine(@CurrentUser() user: JwtUser) {
    return this.disputesService.getMine(user);
  }

  @Patch(':id/resolve')
  resolve(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.disputesService.resolve(user, id);
  }
}
