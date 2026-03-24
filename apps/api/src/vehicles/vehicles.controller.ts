import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('mine')
  listMine(@CurrentUser() user: JwtUser) {
    return this.vehiclesService.listMine(user);
  }

  @Post()
  createMine(@CurrentUser() user: JwtUser, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.createMine(user, dto);
  }

  @Delete(':id')
  deleteMine(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vehiclesService.deleteMine(user, id);
  }
}
