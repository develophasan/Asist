import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/auth/auth.service';
import { UserRole } from './src/domain/enums/user-role.enum';
import { User } from './src/database/entities/user.entity';
import { DataSource } from 'typeorm';

async function generateAdminToken() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);

  let admin = await userRepo.findOne({ where: { phone: '+905001234567' } });
  if (!admin) {
    admin = await userRepo.save(userRepo.create({
      phone: '+905001234567',
      role: UserRole.Admin,
      kycStatus: 'verified' as any
    }));
  }

  const { accessToken } = await (authService as any).issueTokens(admin);
  console.log('ADMIN_TOKEN:' + accessToken);
  await app.close();
}

generateAdminToken();
