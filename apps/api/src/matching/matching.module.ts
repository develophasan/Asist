import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { AgentProfile } from '../database/entities/agent-profile.entity';
import { MatchOffer } from '../database/entities/match-offer.entity';
import { Assignment } from '../database/entities/assignment.entity';
import { RequestEvent } from '../database/entities/request-event.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    RealtimeModule,
    TypeOrmModule.forFeature([
      ServiceRequest,
      AgentProfile,
      MatchOffer,
      Assignment,
      RequestEvent,
    ]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
