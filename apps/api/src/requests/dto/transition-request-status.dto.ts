import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequestStatus } from '../../domain/enums/request-status.enum';

export class TransitionRequestStatusDto {
  @IsEnum(RequestStatus)
  toStatus!: RequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
