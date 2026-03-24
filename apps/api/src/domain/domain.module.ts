import { Global, Module } from '@nestjs/common';
import { RequestStateMachineService } from './request-state-machine.service';

@Global()
@Module({
  providers: [RequestStateMachineService],
  exports: [RequestStateMachineService],
})
export class DomainModule {}
