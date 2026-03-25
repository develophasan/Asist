import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, IsNull, Repository } from 'typeorm';
import { AgentProfile } from '../database/entities/agent-profile.entity';
import { Assignment } from '../database/entities/assignment.entity';
import { MatchOffer } from '../database/entities/match-offer.entity';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { RequestEvent } from '../database/entities/request-event.entity';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { UserRole } from '../domain/enums/user-role.enum';
import { RequestStatus } from '../domain/enums/request-status.enum';
import { RequestStateMachineService } from '../domain/request-state-machine.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationService } from '../common/notification.service';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly requestsRepo: Repository<ServiceRequest>,
    @InjectRepository(AgentProfile)
    private readonly agentsRepo: Repository<AgentProfile>,
    @InjectRepository(MatchOffer)
    private readonly offersRepo: Repository<MatchOffer>,
    @InjectRepository(Assignment)
    private readonly assignmentsRepo: Repository<Assignment>,
    @InjectRepository(RequestEvent)
    private readonly eventsRepo: Repository<RequestEvent>,
    private readonly sm: RequestStateMachineService,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationService,
  ) {}

  async dispatch(currentUser: JwtUser, requestId: string, maxDistanceKm = 15) {
    if (currentUser.role !== UserRole.Admin) {
      throw new ForbiddenException('Only admin can dispatch');
    }
    const req = await this.requestsRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== RequestStatus.Pending) {
      throw new BadRequestException('Request must be pending');
    }

    const candidates = await this.agentsRepo.find({
      where: {
        isAvailable: true,
        city: req.city ?? undefined,
        zone: req.zone ?? undefined,
      },
    });

    const nearest = candidates
      .filter((a) => a.lastLat != null && a.lastLng != null)
      .map((a) => ({
        agent: a,
        distanceKm: this.haversineKm(
          req.pickupLat,
          req.pickupLng,
          a.lastLat as number,
          a.lastLng as number,
        ),
      }))
      .filter((x) => x.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    if (nearest.length === 0) {
      throw new NotFoundException('No eligible agents found');
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const offers = nearest.map((x) =>
      this.offersRepo.create({
        requestId: req.id,
        agentId: x.agent.id,
        expiresAt,
      }),
    );
    const saved = await this.offersRepo.save(offers);

    // Bildirim gönder
    for (const off of saved) {
      const agent = nearest.find(n => n.agent.id === off.agentId)?.agent;
      if (agent?.userId) {
        this.notifications.sendPushNotification(
          agent.userId,
          'Yeni İş Talebi! 🚗',
          `${req.serviceType} hizmeti için yeni bir teklifiniz var.`,
          { requestId: req.id, offerId: off.id }
        );
      }
    }

    return {
      requestId: req.id,
      offeredAgentCount: saved.length,
      offers: saved.map((o) => ({ id: o.id, agentId: o.agentId, expiresAt })),
    };
  }

  async acceptOffer(currentUser: JwtUser, offerId: string) {
    if (currentUser.role !== UserRole.Agent) {
      throw new ForbiddenException('Only agents can accept offers');
    }
    return this.dataSource.transaction(async (manager) => {
      const offersRepo = manager.getRepository(MatchOffer);
      const agentRepo = manager.getRepository(AgentProfile);
      const requestRepo = manager.getRepository(ServiceRequest);
      const assignmentRepo = manager.getRepository(Assignment);
      const eventsRepo = manager.getRepository(RequestEvent);

      const offer = await offersRepo.findOne({ where: { id: offerId } });
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.acceptedAt) throw new BadRequestException('Offer already accepted');
      if (offer.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('Offer expired');
      }

      const agent = await agentRepo.findOne({
        where: { id: offer.agentId, userId: currentUser.sub },
      });
      if (!agent) throw new ForbiddenException('Offer does not belong to agent');

      const existingAccepted = await offersRepo.findOne({
        where: { requestId: offer.requestId, acceptedAt: Not(IsNull()) },
      });
      if (!existingAccepted || existingAccepted.id !== offer.id) {
        const already = await assignmentRepo.findOne({
          where: { requestId: offer.requestId },
        });
        if (already) throw new BadRequestException('Request already assigned');
      }

      const request = await requestRepo.findOne({ where: { id: offer.requestId } });
      if (!request) throw new NotFoundException('Request not found');
      this.sm.assertTransition(request.status, RequestStatus.Matched);

      offer.acceptedAt = new Date();
      await offersRepo.save(offer);
      request.status = RequestStatus.Matched;
      await requestRepo.save(request);
      await assignmentRepo.save(
        assignmentRepo.create({
          requestId: request.id,
          agentId: agent.id,
          acceptedAt: new Date(),
          startedAt: null,
          completedAt: null,
        }),
      );
      await eventsRepo.save(
        eventsRepo.create({
          requestId: request.id,
          status: RequestStatus.Matched,
          note: `Matched with agent ${agent.id}`,
        }),
      );
      this.realtime.emitRequestUpdate(request.id, {
        requestId: request.id,
        status: RequestStatus.Matched,
        agentId: agent.id,
      });

      this.notifications.sendPushNotification(
        request.userId,
        'Emanetçi Bulundu! ✨',
        'İşleminiz için bir emanetçi atandı ve yola çıkmaya hazır.',
        { requestId: request.id, status: RequestStatus.Matched }
      );

      return { ok: true, requestId: request.id, agentId: agent.id };
    });
  }

  async myOpenOffers(currentUser: JwtUser) {
    if (currentUser.role !== UserRole.Agent) {
      throw new ForbiddenException('Only agents can view offers');
    }
    const agent = await this.agentsRepo.findOne({
      where: { userId: currentUser.sub },
    });
    if (!agent) {
      return [];
    }
    return this.offersRepo.find({
      where: { agentId: agent.id, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async updateMyLocation(currentUser: JwtUser, lat: number, lng: number) {
    if (currentUser.role !== UserRole.Agent) {
      throw new ForbiddenException('Only agents can update location');
    }
    const agent = await this.agentsRepo.findOne({
      where: { userId: currentUser.sub },
    });
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }
    agent.lastLat = lat;
    agent.lastLng = lng;
    agent.isAvailable = true;
    await this.agentsRepo.save(agent);
    const activeAssignment = await this.assignmentsRepo.findOne({
      where: { agentId: agent.id, completedAt: IsNull() },
      order: { acceptedAt: 'DESC' },
    });
    if (activeAssignment) {
      await this.eventsRepo.save(
        this.eventsRepo.create({
          requestId: activeAssignment.requestId,
          status: RequestStatus.InProgress,
          geo: { lat, lng },
          note: 'Agent location update',
        }),
      );
      this.realtime.emitRequestUpdate(activeAssignment.requestId, {
        requestId: activeAssignment.requestId,
        geo: { lat, lng },
        status: RequestStatus.InProgress,
      });
    }
    return { ok: true, lat, lng };
  }

  async myCurrentTask(currentUser: JwtUser) {
    if (currentUser.role !== UserRole.Agent) {
      throw new ForbiddenException('Only agents can view tasks');
    }
    const agent = await this.agentsRepo.findOne({
      where: { userId: currentUser.sub },
    });
    if (!agent) return null;
    const assignment = await this.assignmentsRepo.findOne({
      where: { agentId: agent.id, completedAt: IsNull() },
      order: { acceptedAt: 'DESC' },
    });
    if (!assignment) return null;
    const request = await this.requestsRepo.findOne({
      where: { id: assignment.requestId },
    });
    return { assignment, request };
  }

  async progressMyTask(currentUser: JwtUser, toStatus: RequestStatus) {
    if (currentUser.role !== UserRole.Agent) {
      throw new ForbiddenException('Only agents can progress task');
    }
    const task = await this.myCurrentTask(currentUser);
    if (!task || !task.request) {
      throw new NotFoundException('Active task not found');
    }
    const { assignment, request } = task;
    this.sm.assertTransition(request.status, toStatus);
    request.status = toStatus;
    await this.requestsRepo.save(request);
    if (toStatus === RequestStatus.PickupStarted && !assignment.startedAt) {
      assignment.startedAt = new Date();
      await this.assignmentsRepo.save(assignment);
    }
    if (toStatus === RequestStatus.Completed) {
      assignment.completedAt = new Date();
      await this.assignmentsRepo.save(assignment);
    }
    await this.eventsRepo.save(
      this.eventsRepo.create({
        requestId: request.id,
        status: toStatus,
        note: `Agent progressed task to ${toStatus}`,
      }),
    );
    this.realtime.emitRequestUpdate(request.id, {
      requestId: request.id,
      status: toStatus,
    });

    const bodyMap: Record<string, string> = {
      [RequestStatus.PickupStarted]: 'Emanetçi aracınızı teslim almak için yola çıktı.',
      [RequestStatus.InProgress]: 'Aracınızın işlemleri başlatıldı.',
      [RequestStatus.Completed]: 'İşlem başarıyla tamamlandı, aracınız teslimata hazır!',
    };

    if (bodyMap[toStatus]) {
      this.notifications.sendPushNotification(
        request.userId,
        'Görev Güncellemesi 🛠️',
        bodyMap[toStatus],
        { requestId: request.id, status: toStatus }
      );
    }

    return { ok: true, requestId: request.id, status: toStatus };
  }

  async myTasks(currentUser: JwtUser) {
    if (currentUser.role !== UserRole.Agent) {
      throw new ForbiddenException('Only agents can view their tasks');
    }
    const agent = await this.agentsRepo.findOne({
      where: { userId: currentUser.sub },
    });
    if (!agent) return [];

    return this.assignmentsRepo.find({
      where: { agentId: agent.id },
      relations: ['request'],
      order: { acceptedAt: 'DESC' },
    });
  }

  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const r = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(a));
  }
}
