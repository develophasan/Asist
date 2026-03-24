import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { DisputeType } from '../../domain/enums/dispute-type.enum';

export class CreateDisputeDto {
  @IsUUID()
  requestId!: string;

  @IsEnum(DisputeType)
  type!: DisputeType;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
