import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RequestStatus } from '../../domain/enums/request-status.enum';
import { ServiceRequest } from './service-request.entity';

export type GeoPoint = { lat: number; lng: number };

@Entity({ name: 'request_events' })
export class RequestEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @Column({ type: 'enum', enum: RequestStatus })
  status!: RequestStatus;

  @Column({ type: 'jsonb', nullable: true })
  geo!: GeoPoint | null;

  @Column({ type: 'text', name: 'media_url', nullable: true })
  mediaUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  ts!: Date;
}
