import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../database/entities/dispute.entity';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { DisputeStatus } from '../domain/enums/dispute-status.enum';
import { UserRole } from '../domain/enums/user-role.enum';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputesRepo: Repository<Dispute>,
    @InjectRepository(ServiceRequest)
    private readonly requestsRepo: Repository<ServiceRequest>,
  ) {}

  async create(currentUser: JwtUser, dto: CreateDisputeDto) {
    const request = await this.requestsRepo.findOne({
      where: { id: dto.requestId },
    });
    if (!request) throw new NotFoundException('Request not found');

    if (
      currentUser.role !== UserRole.Admin &&
      request.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('You are not part of this request');
    }

    const dispute = this.disputesRepo.create({
      requestId: dto.requestId,
      type: dto.type,
      description: dto.description,
      status: DisputeStatus.Open,
    });
    return this.disputesRepo.save(dispute);
  }

  async getMine(currentUser: JwtUser) {
    if (currentUser.role === UserRole.Admin) {
      return this.disputesRepo.find({
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }
    const requests = await this.requestsRepo.find({
      where: { userId: currentUser.sub },
      select: ['id'],
    });
    const requestIds = requests.map((r) => r.id);
    if (requestIds.length === 0) return [];
    return this.disputesRepo
      .createQueryBuilder('d')
      .where('d.request_id IN (:...ids)', { ids: requestIds })
      .orderBy('d.created_at', 'DESC')
      .take(100)
      .getMany();
  }

  async resolve(currentUser: JwtUser, disputeId: string) {
    if (currentUser.role !== UserRole.Admin) {
      throw new ForbiddenException('Only admin can resolve disputes');
    }
    const dispute = await this.disputesRepo.findOne({
      where: { id: disputeId },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === DisputeStatus.Resolved) {
      throw new BadRequestException('Dispute already resolved');
    }
    dispute.status = DisputeStatus.Resolved;
    return this.disputesRepo.save(dispute);
  }
}
