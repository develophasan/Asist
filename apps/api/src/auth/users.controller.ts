import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { JwtUser } from './interfaces/jwt-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Patch('me/push-token')
  async updatePushToken(
    @CurrentUser() user: JwtUser,
    @Body('token') token: string,
  ) {
    await this.userRepo.update(user.sub, { pushToken: token });
    return { ok: true };
  }
}
