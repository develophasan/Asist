import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AgentProfile } from './database/entities/agent-profile.entity';
import { Assignment } from './database/entities/assignment.entity';
import { Dispute } from './database/entities/dispute.entity';
import { Payment } from './database/entities/payment.entity';
import { RequestEvent } from './database/entities/request-event.entity';
import { Review } from './database/entities/review.entity';
import { ServiceRequest } from './database/entities/service-request.entity';
import { User } from './database/entities/user.entity';
import { Vehicle } from './database/entities/vehicle.entity';
import { OtpCode } from './database/entities/otp-code.entity';
import { MatchOffer } from './database/entities/match-offer.entity';
import { DatabaseInitService } from './database/database-init.service';
import { DomainModule } from './domain/domain.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { MatchingModule } from './matching/matching.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';

const entities = [
  User,
  Vehicle,
  AgentProfile,
  ServiceRequest,
  Assignment,
  RequestEvent,
  Payment,
  Review,
  Dispute,
  OtpCode,
  MatchOffer,
];

loadEnv({ path: resolve(process.cwd(), 'apps/api/.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });

const dbMode = process.env.ASIST_DB_MODE ?? 'on';
const queueMode = process.env.ASIST_QUEUE_MODE ?? 'off';
const dbEnabled = dbMode !== 'off';
const queueEnabled = queueMode !== 'off';

const dbImports = dbEnabled
  ? [
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          type: 'postgres',
          ...(config.get<string>('database.url')
            ? { url: config.get<string>('database.url') }
            : {
                host: config.get<string>('database.host'),
                port: config.get<number>('database.port'),
                username: config.get<string>('database.user'),
                password: config.get<string>('database.password'),
                database: config.get<string>('database.name'),
              }),
          entities,
          synchronize: config.get<boolean>('typeOrmSync'),
          logging: config.get<string>('nodeEnv') === 'development',
        }),
      }),
    ]
  : [];

const queueImports = queueEnabled
  ? [
      BullModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          connection: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          },
        }),
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        resolve(process.cwd(), 'apps/api/.env'),
        resolve(process.cwd(), '.env'),
        resolve(__dirname, '..', '.env'),
      ],
    }),
    ...dbImports,
    ...queueImports,
    DomainModule,
    HealthModule,
    RealtimeModule,
    AuthModule,
    RequestsModule,
    MatchingModule,
    VehiclesModule,
    AdminModule,
    PaymentsModule,
  ],
  providers: [...(dbEnabled ? [DatabaseInitService] : [])],
})
export class AppModule {}
