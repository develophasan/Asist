import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { KycStatus } from '../../domain/enums/kyc-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { AgentProfile } from './agent-profile.entity';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ type: 'varchar', length: 32, unique: true })
  phone!: string;

  @Column({ type: 'varchar', length: 255, name: 'refresh_token_hash', nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.Pending })
  kycStatus!: KycStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  ratingAvg!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Vehicle, (v) => v.owner)
  vehicles!: Vehicle[];

  @OneToOne(() => AgentProfile, (a) => a.user)
  agentProfile?: AgentProfile | null;
}
