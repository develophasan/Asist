import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../database/entities/user.entity';
import { AgentProfile } from '../database/entities/agent-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AgentProfile])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
