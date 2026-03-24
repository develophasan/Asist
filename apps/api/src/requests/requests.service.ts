import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestStateMachineService } from '../domain/request-state-machine.service';
import { RequestStatus } from '../domain/enums/request-status.enum';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { RequestEvent } from '../database/entities/request-event.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { UserRole } from '../domain/enums/user-role.enum';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly requestsRepo: Repository<ServiceRequest>,
    @InjectRepository(RequestEvent)
    private readonly eventsRepo: Repository<RequestEvent>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
    private readonly sm: RequestStateMachineService,
  ) {}

  async createRequest(currentUser: JwtUser, dto: CreateRequestDto) {
    if (currentUser.role !== UserRole.Customer) {
      throw new ForbiddenException('Only customers can create requests');
    }
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id: dto.vehicleId, userId: currentUser.sub },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    this.sm.assertTransition(RequestStatus.Draft, RequestStatus.Pending);

    const request = this.requestsRepo.create({
      userId: currentUser.sub,
      vehicleId: dto.vehicleId,
      serviceType: dto.serviceType,
      pickupAddr: dto.pickupAddr,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropAddr: dto.dropAddr,
      dropLat: dto.dropLat ?? null,
      dropLng: dto.dropLng ?? null,
      city: dto.city ?? null,
      zone: dto.zone ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      priceEst: dto.priceEst.toFixed(2),
      status: RequestStatus.Pending,
    });
    const saved = await this.requestsRepo.save(request);
    await this.eventsRepo.save(
      this.eventsRepo.create({
        requestId: saved.id,
        status: saved.status,
        geo: { lat: saved.pickupLat, lng: saved.pickupLng },
        note: 'Request created',
      }),
    );
    return saved;
  }

  async transitionStatus(
    currentUser: JwtUser,
    requestId: string,
    toStatus: RequestStatus,
    note?: string,
  ) {
    const request = await this.requestsRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (
      currentUser.role === UserRole.Customer &&
      request.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Cannot update another customer request');
    }
    if (
      currentUser.role === UserRole.Customer &&
      ![RequestStatus.Cancelled].includes(toStatus)
    ) {
      throw new ForbiddenException('Customer can only cancel request');
    }
    if (request.status === RequestStatus.Closed) {
      throw new BadRequestException('Request already closed');
    }

    this.sm.assertTransition(request.status, toStatus);
    request.status = toStatus;
    const saved = await this.requestsRepo.save(request);
    await this.eventsRepo.save(
      this.eventsRepo.create({
        requestId: saved.id,
        status: toStatus,
        note: note ?? null,
      }),
    );
    return saved;
  }

  async getMine(currentUser: JwtUser) {
    if (currentUser.role === UserRole.Admin) {
      return this.requestsRepo.find({
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }
    return this.requestsRepo.find({
      where: { userId: currentUser.sub },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getEvents(currentUser: JwtUser, requestId: string) {
    const request = await this.requestsRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    if (
      currentUser.role !== UserRole.Admin &&
      request.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Not allowed to view this request');
    }
    return this.eventsRepo.find({
      where: { requestId },
      order: { ts: 'ASC' },
      take: 500,
    });
  }
}
