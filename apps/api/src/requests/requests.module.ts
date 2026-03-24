import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { RequestEvent } from '../database/entities/request-event.entity';
import { Vehicle } from '../database/entities/vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest, RequestEvent, Vehicle])],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
