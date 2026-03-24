import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgentBadge } from '../../domain/enums/agent-badge.enum';
import { AgentProfileStatus } from '../../domain/enums/agent-profile-status.enum';
import { BackgroundCheckStatus } from '../../domain/enums/background-check-status.enum';
import { User } from './user.entity';

@Entity({ name: 'agents' })
export class AgentProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId!: string;

  @OneToOne(() => User, (u) => u.agentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 64, name: 'license_no' })
  licenseNo!: string;

  @Column({ type: 'enum', enum: BackgroundCheckStatus, name: 'background_check' })
  backgroundCheck!: BackgroundCheckStatus;

  @Column({ type: 'enum', enum: AgentBadge, default: AgentBadge.None })
  badge!: AgentBadge;

  @Column({ type: 'enum', enum: AgentProfileStatus })
  status!: AgentProfileStatus;

  @Column({ type: 'boolean', default: false, name: 'is_available' })
  isAvailable!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  zone!: string | null;

  @Column({ type: 'double precision', name: 'last_lat', nullable: true })
  lastLat!: number | null;

  @Column({ type: 'double precision', name: 'last_lng', nullable: true })
  lastLng!: number | null;
}
