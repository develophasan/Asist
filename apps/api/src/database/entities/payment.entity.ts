import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { PaymentMethod } from '../../domain/enums/payment-method.enum';
import { ServiceRequest } from './service-request.entity';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 8, default: 'TRY' })
  currency!: string;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.Card })
  method!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 255, name: 'provider_ref', nullable: true })
  providerRef!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'idempotency_key', nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'timestamptz', name: 'customer_confirmed_at', nullable: true })
  customerConfirmedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'agent_confirmed_at', nullable: true })
  agentConfirmedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
