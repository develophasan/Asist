import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { UserRole } from '../domain/enums/user-role.enum';
import { User } from '../database/entities/user.entity';
import { AgentProfile } from '../database/entities/agent-profile.entity';
import { KycStatus } from '../domain/enums/kyc-status.enum';
import { AgentProfileStatus } from '../domain/enums/agent-profile-status.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(AgentProfile)
    private readonly agentsRepo: Repository<AgentProfile>,
  ) {}

  private assertAdmin(user: JwtUser) {
    if (user.role !== UserRole.Admin) {
      throw new ForbiddenException('Admin role required');
    }
  }

  async listAgentKycQueue(user: JwtUser) {
    this.assertAdmin(user);
    return this.agentsRepo.find({
      relations: ['user'],
      order: { id: 'DESC' },
      take: 200,
    });
  }

  async decideAgentKyc(
    user: JwtUser,
    agentId: string,
    status: KycStatus,
    _note?: string,
  ) {
    this.assertAdmin(user);
    const agent = await this.agentsRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    const account = await this.usersRepo.findOne({ where: { id: agent.userId } });
    if (!account) throw new NotFoundException('User account not found');

    account.kycStatus = status;
    agent.status =
      status === KycStatus.Verified
        ? AgentProfileStatus.Active
        : AgentProfileStatus.Suspended;
    agent.isAvailable = status === KycStatus.Verified;

    await this.usersRepo.save(account);
    await this.agentsRepo.save(agent);
    return { ok: true, agentId: agent.id, userId: account.id, status };
  }
}
