import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgentProfile } from './agent-profile.entity';
import { ServiceRequest } from './service-request.entity';

@Entity({ name: 'assignments' })
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => ServiceRequest, (r) => r.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId!: string;

  @ManyToOne(() => AgentProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agent_id' })
  agent!: AgentProfile;

  @Column({ type: 'timestamptz', name: 'accepted_at', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;
}
