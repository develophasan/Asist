import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisputeStatus } from '../../domain/enums/dispute-status.enum';
import { DisputeType } from '../../domain/enums/dispute-type.enum';
import { ServiceRequest } from './service-request.entity';

@Entity({ name: 'disputes' })
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @Column({ type: 'enum', enum: DisputeType })
  type!: DisputeType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.Open })
  status!: DisputeStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
