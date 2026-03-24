import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { compare, hash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { User } from '../database/entities/user.entity';
import { OtpCode } from '../database/entities/otp-code.entity';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserRole } from '../domain/enums/user-role.enum';
import type { JwtUser } from './interfaces/jwt-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private redis: Redis | null = null;

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(OtpCode) private readonly otpRepo: Repository<OtpCode>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const queueMode = process.env.ASIST_QUEUE_MODE ?? 'off';
    if (queueMode !== 'off') {
      this.redis = new Redis({
        host: config.get<string>('redis.host') ?? '127.0.0.1',
        port: config.get<number>('redis.port') ?? 6379,
        lazyConnect: true,
      });
    }
  }

  async requestOtp(dto: RequestOtpDto): Promise<{
    expiresInSec: number;
    debugCode?: string;
  }> {
    // Rate limiting: 1 dakikada max 3 istek (Redis varsa)
    if (this.redis) {
      await this.redis.connect().catch(() => {});
      const key = `otp:rl:${dto.phone}`;
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 60);
      if (count > 3) {
        throw new BadRequestException(
          'Too many OTP requests. Please wait 1 minute.',
        );
      }
    }

    const ttlSec = this.config.get<number>('otp.ttlSec') ?? 180;

    const maxAttempts = this.config.get<number>('otp.maxAttempts') ?? 5;
    const code = this.generateOtpCode();
    const codeHash = await hash(code, 10);
    const otp = this.otpRepo.create({
      phone: dto.phone,
      codeHash,
      expiresAt: new Date(Date.now() + ttlSec * 1000),
      maxAttempts,
      attemptCount: 0,
      consumedAt: null,
    });
    await this.otpRepo.save(otp);
    this.logger.log(
      `OTP generated for ${this.maskPhone(dto.phone)} role=${dto.role} purpose=${dto.purpose}`,
    );
    this.logger.debug(`OTP debug code (${dto.phone}): ${code}`);
    const exposeDebugCode = this.config.get<boolean>('otp.exposeDebugCode');
    return exposeDebugCode ? { expiresInSec: ttlSec, debugCode: code } : { expiresInSec: ttlSec };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Pick<User, 'id' | 'phone' | 'role' | 'kycStatus'>;
  }> {
    const otp = await this.otpRepo.findOne({
      where: { phone: dto.phone },
      order: { createdAt: 'DESC' },
    });
    if (!otp) {
      throw new UnauthorizedException('OTP not found');
    }
    if (otp.consumedAt) {
      throw new UnauthorizedException('OTP already consumed');
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('OTP expired');
    }
    if (otp.attemptCount >= otp.maxAttempts) {
      throw new UnauthorizedException('OTP attempt limit exceeded');
    }

    const valid = await compare(dto.code, otp.codeHash);
    if (!valid) {
      otp.attemptCount += 1;
      await this.otpRepo.save(otp);
      throw new UnauthorizedException('OTP invalid');
    }
    otp.consumedAt = new Date();
    await this.otpRepo.save(otp);

    let user = await this.usersRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      user = this.usersRepo.create({ phone: dto.phone, role: UserRole.Customer });
      await this.usersRepo.save(user);
    }
    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtUser;
    try {
      payload = await this.jwtService.verifyAsync<JwtUser>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token rejected');
    }
    const ok = await compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException('Refresh token mismatch');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.refreshTokenHash = null;
    await this.usersRepo.save(user);
  }

  private async issueTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtUser = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<number>('jwt.accessTtlSec') ?? 900,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<number>('jwt.refreshTtlSec') ?? 604800,
    });
    user.refreshTokenHash = await hash(refreshToken, 10);
    await this.usersRepo.save(user);
    return { accessToken, refreshToken };
  }

  private generateOtpCode(): string {
    return `${randomInt(0, 1000000)}`.padStart(6, '0');
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) {
      return '****';
    }
    return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
  }
}
