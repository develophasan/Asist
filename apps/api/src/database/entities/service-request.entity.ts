import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequestStatus } from '../../domain/enums/request-status.enum';
import { ServiceType } from '../../domain/enums/service-type.enum';
import { Assignment } from './assignment.entity';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'requests' })
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  customer!: User;

  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle, (v) => v.requests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ type: 'enum', enum: ServiceType, name: 'service_type' })
  serviceType!: ServiceType;

  @Column({ type: 'text', name: 'pickup_addr' })
  pickupAddr!: string;

  @Column({ type: 'double precision', name: 'pickup_lat' })
  pickupLat!: number;

  @Column({ type: 'double precision', name: 'pickup_lng' })
  pickupLng!: number;

  @Column({ type: 'text', name: 'drop_addr' })
  dropAddr!: string;

  @Column({ type: 'double precision', name: 'drop_lat', nullable: true })
  dropLat!: number | null;

  @Column({ type: 'double precision', name: 'drop_lng', nullable: true })
  dropLng!: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  zone!: string | null;

  @Column({ type: 'timestamptz', name: 'scheduled_at' })
  scheduledAt!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price_est' })
  priceEst!: string;

  @Column({ type: 'enum', enum: RequestStatus })
  status!: RequestStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Assignment, (a) => a.request)
  assignments!: Assignment[];
}
