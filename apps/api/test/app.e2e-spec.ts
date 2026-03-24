import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Vehicle } from '../src/database/entities/vehicle.entity';
import { User } from '../src/database/entities/user.entity';
import { UserRole } from '../src/domain/enums/user-role.enum';
import { KycStatus } from '../src/domain/enums/kyc-status.enum';
import { AgentProfile } from '../src/database/entities/agent-profile.entity';
import { AgentProfileStatus } from '../src/domain/enums/agent-profile-status.enum';
import { BackgroundCheckStatus } from '../src/domain/enums/background-check-status.enum';
import { RequestStatus } from '../src/domain/enums/request-status.enum';

describe('Asist API (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let ds: DataSource;

  beforeAll(async () => {
    process.env.OTP_EXPOSE_DEBUG_CODE = 'true';
    process.env.ASIST_QUEUE_MODE = 'off';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('runs auth -> request -> matching flow', async () => {
    const suffix = Date.now().toString().slice(-6);
    const customerPhone = `+90555${suffix}001`;
    const adminPhone = `+90555${suffix}999`;
    const agentPhones = [`+90555${suffix}111`, `+90555${suffix}112`, `+90555${suffix}113`];

    const otpReq = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: customerPhone, role: UserRole.Customer, purpose: 'login' })
      .expect(201);
    const otpCode = otpReq.body.debugCode as string;
    expect(otpCode).toBeDefined();

    const verify = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: customerPhone, code: otpCode })
      .expect(201);
    const accessToken = verify.body.accessToken as string;
    const customerUserId = verify.body.user.id as string;

    const vehicle = await ds.getRepository(Vehicle).save(
      ds.getRepository(Vehicle).create({
        userId: customerUserId,
        plate: `34TST${suffix}`,
        brand: 'Renault',
        model: 'Clio',
      }),
    );

    const createReq = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        vehicleId: vehicle.id,
        serviceType: 'inspection',
        pickupAddr: 'Kadikoy pickup',
        pickupLat: 40.992,
        pickupLng: 29.029,
        dropAddr: 'TUVTURK station',
        dropLat: 40.998,
        dropLng: 29.05,
        city: 'Istanbul',
        zone: 'Kadikoy',
        scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
        priceEst: 1500,
      })
      .expect(201);
    expect(createReq.body.status).toBe(RequestStatus.Pending);
    const requestId = createReq.body.id as string;

    const userRepo = ds.getRepository(User);
    const agentsRepo = ds.getRepository(AgentProfile);
    const admin = await userRepo.save(
      userRepo.create({
        phone: adminPhone,
        role: UserRole.Admin,
        kycStatus: KycStatus.Verified,
      }),
    );
    for (let i = 0; i < 3; i++) {
      const agentUser = await userRepo.save(
        userRepo.create({
          phone: agentPhones[i],
          role: UserRole.Agent,
          kycStatus: KycStatus.Verified,
          ratingAvg: '4.9',
        }),
      );
      await agentsRepo.save(
        agentsRepo.create({
          userId: agentUser.id,
          licenseNo: `LIC-TST-${suffix}-${i}`,
          backgroundCheck: BackgroundCheckStatus.Clear,
          status: AgentProfileStatus.Active,
          isAvailable: true,
          city: 'Istanbul',
          zone: 'Kadikoy',
          lastLat: 40.991 + i * 0.002,
          lastLng: 29.03 + i * 0.002,
        }),
      );
    }

    const adminOtpReq = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: adminPhone, role: UserRole.Admin, purpose: 'login' })
      .expect(201);
    const adminVerify = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: adminPhone, code: adminOtpReq.body.debugCode })
      .expect(201);
    const adminToken = adminVerify.body.accessToken as string;
    await userRepo.update({ id: admin.id }, { role: UserRole.Admin });

    const dispatch = await request(app.getHttpServer())
      .post(`/matching/dispatch/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxDistanceKm: 20 })
      .expect(201);
    expect(dispatch.body.offeredAgentCount).toBeGreaterThan(0);
  });
});
