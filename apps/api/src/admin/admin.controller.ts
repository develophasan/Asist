import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { AdminService } from './admin.service';
import { AgentKycDecisionDto } from './dto/agent-kyc-decision.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('agents/kyc')
  listAgentKycQueue(@CurrentUser() user: JwtUser) {
    return this.adminService.listAgentKycQueue(user);
  }

  @Patch('agents/:agentId/kyc')
  decideAgentKyc(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Body() dto: AgentKycDecisionDto,
  ) {
    return this.adminService.decideAgentKyc(user, agentId, dto.status, dto.note);
  }
}
