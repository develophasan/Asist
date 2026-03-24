import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycStatus } from '../../domain/enums/kyc-status.enum';

export class AgentKycDecisionDto {
  @IsEnum(KycStatus)
  status!: KycStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
