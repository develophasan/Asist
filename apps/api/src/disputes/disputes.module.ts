import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from '../database/entities/dispute.entity';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, ServiceRequest])],
  providers: [DisputesService],
  controllers: [DisputesController],
})
export class DisputesModule {}
