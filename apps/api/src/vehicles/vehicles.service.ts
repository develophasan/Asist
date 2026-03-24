import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { UserRole } from '../domain/enums/user-role.enum';
import { Vehicle } from '../database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
  ) {}

  async listMine(user: JwtUser) {
    if (user.role !== UserRole.Customer) {
      throw new ForbiddenException('Only customers can list vehicles');
    }
    return this.vehiclesRepo.find({
      where: { userId: user.sub },
      order: { plate: 'ASC' },
    });
  }

  async createMine(user: JwtUser, dto: CreateVehicleDto) {
    if (user.role !== UserRole.Customer) {
      throw new ForbiddenException('Only customers can create vehicles');
    }
    const entity = this.vehiclesRepo.create({
      userId: user.sub,
      plate: dto.plate.toUpperCase(),
      brand: dto.brand,
      model: dto.model,
      fuel: dto.fuel ?? null,
      notes: dto.notes ?? null,
    });
    return this.vehiclesRepo.save(entity);
  }

  async deleteMine(user: JwtUser, id: string) {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.userId !== user.sub) {
      throw new ForbiddenException('Vehicle does not belong to you');
    }
    await this.vehiclesRepo.remove(vehicle);
    return { ok: true };
  }
}
