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

import { DisputeType } from '../src/domain/enums/dispute-type.enum';
import { ServiceRequest } from '../src/database/entities/service-request.entity';
import { MatchOffer } from '../src/database/entities/match-offer.entity';
import path from 'path';
import fs from 'fs';

import { setupApp } from '../src/setup-app';

jest.mock('../src/common/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendPushNotification: jest.fn().mockResolvedValue(null),
    broadcastToAgents: jest.fn().mockResolvedValue(null),
  })),
}));

describe('Asist API (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    process.env.OTP_EXPOSE_DEBUG_CODE = 'true';
    process.env.ASIST_QUEUE_MODE = 'off';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('runs full flow: auth -> request -> matching -> completion -> review -> dispute -> media', async () => {
    const suffix = Date.now().toString().slice(-6);
    const customerPhone = `+90555${suffix}001`;
    const adminPhone = `+90555${suffix}999`;
    const agentPhone = `+90555${suffix}111`;

    // 1. Auth & Registry
    const otpReq = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: customerPhone, role: UserRole.Customer, purpose: 'login' })
      .expect(201);
    
    const verify = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: customerPhone, code: otpReq.body.debugCode })
      .expect(201);
    const customerToken = verify.body.accessToken as string;
    const customerUserId = verify.body.user.id as string;

    // 1b. Push Token (Customer)
    await request(app.getHttpServer())
      .patch('/users/me/push-token')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token: 'expo-token-customer' })
      .expect(200);

    const vehicle = await ds.getRepository(Vehicle).save(
      ds.getRepository(Vehicle).create({
        userId: customerUserId,
        plate: `34TST${suffix}`,
        brand: 'Renault',
        model: 'Clio',
      }),
    );

    const city = `Istanbul-${suffix}`;
    const zone = `Kadikoy-${suffix}`;

    // 2. Create Request
    const createReq = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: vehicle.id,
        serviceType: 'inspection',
        pickupAddr: 'Kadikoy pickup',
        pickupLat: 40.992,
        pickupLng: 29.029,
        dropAddr: 'TUVTURK station',
        dropLat: 40.998,
        dropLng: 29.05,
        city,
        zone,
        scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
        priceEst: 1500,
      })
      .expect(201);
    const requestId = createReq.body.id as string;

    // 3. Setup Agent & Admin
    const userRepo = ds.getRepository(User);
    const agentsRepo = ds.getRepository(AgentProfile);
    
    const admin = await userRepo.save(
      userRepo.create({ phone: adminPhone, role: UserRole.Admin, kycStatus: KycStatus.Verified })
    );

    const agentUser = await userRepo.save(
      userRepo.create({ phone: agentPhone, role: UserRole.Agent, kycStatus: KycStatus.Verified, ratingAvg: '4.9' })
    );
    const agentProfile = await agentsRepo.save(
      agentsRepo.create({
        userId: agentUser.id,
        licenseNo: `LIC-TST-${suffix}`,
        backgroundCheck: BackgroundCheckStatus.Clear,
        status: AgentProfileStatus.Active,
        isAvailable: true,
        city,
        zone,
        lastLat: 40.991,
        lastLng: 29.03,
      })
    );

    // 4. Dispatch (Admin)
    const adminOtpReq = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: adminPhone, role: UserRole.Admin, purpose: 'login' })
      .expect(201);
    const adminVerify = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: adminPhone, code: adminOtpReq.body.debugCode })
      .expect(201);
    const adminToken = adminVerify.body.accessToken as string;

    const dispatch = await request(app.getHttpServer())
      .post(`/matching/dispatch/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxDistanceKm: 20 })
      .expect(201);
    
    expect(dispatch.body.offeredAgentCount).toBeGreaterThan(0);

    const offers = await ds.getRepository(MatchOffer).find({ where: { agentId: agentProfile.id } });
    expect(offers.length).toBeGreaterThan(0);

    // 5. Accept Offer (Agent)
    const agentOtpReq = await request(app.getHttpServer())
      .post('/auth/otp/request')
      .send({ phone: agentPhone, role: UserRole.Agent, purpose: 'login' })
      .expect(201);
    const agentVerify = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: agentPhone, code: agentOtpReq.body.debugCode })
      .expect(201);
    const agentToken = agentVerify.body.accessToken as string;

    await request(app.getHttpServer())
      .patch('/users/me/push-token')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ token: 'expo-token-agent' })
      .expect(200);

    const agentOffers = await request(app.getHttpServer())
      .get('/matching/offers/me')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);
    expect(agentOffers.body.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post(`/matching/offers/${offers[0].id}/accept`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(201);

    // 6. Execution & Completion (Agent)
    await request(app.getHttpServer())
      .post('/matching/tasks/progress')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ toStatus: RequestStatus.PickupStarted })
      .expect(201);

    await request(app.getHttpServer())
      .post('/matching/location')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ lat: 41.001, lng: 28.979 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/matching/tasks/progress')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ toStatus: RequestStatus.InProgress })
      .expect(201);

    await request(app.getHttpServer())
      .post('/matching/tasks/progress')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ toStatus: RequestStatus.Completed })
      .expect(201);

    // 7. Phase 2: Review (Customer)
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: requestId,
        toUserId: agentUser.id,
        rating: 5,
        comment: 'Great service!'
      })
      .expect(201);

    const reviews = await request(app.getHttpServer())
      .get(`/reviews/request/${requestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(reviews.body.length).toBe(1);
    expect(reviews.body[0].rating).toBe(5);

    // 8. Phase 2: Dispute (Customer)
    await request(app.getHttpServer())
      .post('/disputes')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: requestId,
        type: DisputeType.Damage,
        description: 'Small scratch on the bumper'
      })
      .expect(201);

    const myDisputes = await request(app.getHttpServer())
      .get('/disputes/mine')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(myDisputes.body.length).toBe(1);

    // 9. Phase 2: Media Upload
    const testFilePath = path.join(__dirname, 'test-image.jpg');
    fs.writeFileSync(testFilePath, 'dummy image content');

    const upload = await request(app.getHttpServer())
      .post('/media/upload')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('file', testFilePath)
      .expect(201);
    
    expect(upload.body.url).toBeDefined();
    fs.unlinkSync(testFilePath);

    // Verify static access
    await request(app.getHttpServer())
      .get(upload.body.url)
      .expect(200);
  });
});

