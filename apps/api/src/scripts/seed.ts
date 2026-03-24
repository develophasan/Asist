import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { AgentProfile } from '../database/entities/agent-profile.entity';
import { UserRole } from '../domain/enums/user-role.enum';
import { KycStatus } from '../domain/enums/kyc-status.enum';
import { AgentProfileStatus } from '../domain/enums/agent-profile-status.enum';
import { BackgroundCheckStatus } from '../domain/enums/background-check-status.enum';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);
  const users = ds.getRepository(User);
  const vehicles = ds.getRepository(Vehicle);
  const agents = ds.getRepository(AgentProfile);

  const customerPhone = '+905551110001';
  let customer = await users.findOne({ where: { phone: customerPhone } });
  if (!customer) {
    customer = await users.save(
      users.create({
        phone: customerPhone,
        role: UserRole.Customer,
        kycStatus: KycStatus.Verified,
      }),
    );
  }

  const adminPhone = '+905551110002';
  let admin = await users.findOne({ where: { phone: adminPhone } });
  if (!admin) {
    admin = await users.save(
      users.create({
        phone: adminPhone,
        role: UserRole.Admin,
        kycStatus: KycStatus.Verified,
      }),
    );
  }

  const vehiclePlate = '34ASIST001';
  let vehicle = await vehicles.findOne({ where: { plate: vehiclePlate } });
  if (!vehicle) {
    vehicle = await vehicles.save(
      vehicles.create({
        userId: customer.id,
        plate: vehiclePlate,
        brand: 'Toyota',
        model: 'Corolla',
        fuel: 'gasoline',
      }),
    );
  }

  for (let i = 0; i < 3; i++) {
    const phone = `+9055511101${i}`;
    let agentUser = await users.findOne({ where: { phone } });
    if (!agentUser) {
      agentUser = await users.save(
        users.create({
          phone,
          role: UserRole.Agent,
          kycStatus: KycStatus.Verified,
          ratingAvg: '4.90',
        }),
      );
    }
    const existingAgent = await agents.findOne({ where: { userId: agentUser.id } });
    if (!existingAgent) {
      await agents.save(
        agents.create({
          userId: agentUser.id,
          licenseNo: `LIC-IST-${i + 1}`,
          backgroundCheck: BackgroundCheckStatus.Clear,
          status: AgentProfileStatus.Active,
          isAvailable: true,
          city: 'Istanbul',
          zone: 'Kadikoy',
          lastLat: 40.991 + i * 0.005,
          lastLng: 29.038 + i * 0.004,
        }),
      );
    }
  }

  console.log('Seed completed');
  console.log(
    JSON.stringify(
      {
        customerPhone,
        adminPhone,
        customerVehicleId: vehicle.id,
      },
      null,
      2,
    ),
  );
  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
