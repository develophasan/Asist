import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../database/entities/review.entity';
import { ServiceRequest } from '../database/entities/service-request.entity';
import { User } from '../database/entities/user.entity';
import { RequestStatus } from '../domain/enums/request-status.enum';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(ServiceRequest)
    private readonly requestsRepo: Repository<ServiceRequest>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(currentUser: JwtUser, dto: CreateReviewDto) {
    const request = await this.requestsRepo.findOne({
      where: { id: dto.requestId },
    });
    if (!request) throw new NotFoundException('Request not found');

    const allowedStatuses: RequestStatus[] = [
      RequestStatus.Completed,
      RequestStatus.Closed,
    ];
    if (!allowedStatuses.includes(request.status)) {
      throw new BadRequestException(
        'Request must be completed or closed before reviewing',
      );
    }

    // Kullanıcının bu taleple ilişkili olduğunu doğrula
    if (
      request.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('You are not part of this request');
    }

    const existing = await this.reviewsRepo.findOne({
      where: { requestId: dto.requestId, fromUserId: currentUser.sub },
    });
    if (existing) {
      throw new BadRequestException('You have already reviewed this request');
    }

    const toUser = await this.usersRepo.findOne({ where: { id: dto.toUserId } });
    if (!toUser) throw new NotFoundException('Target user not found');

    const review = this.reviewsRepo.create({
      requestId: dto.requestId,
      fromUserId: currentUser.sub,
      toUserId: dto.toUserId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    return this.reviewsRepo.save(review);
  }

  async getByRequest(requestId: string) {
    return this.reviewsRepo.find({
      where: { requestId },
      order: { createdAt: 'ASC' },
    });
  }
}
