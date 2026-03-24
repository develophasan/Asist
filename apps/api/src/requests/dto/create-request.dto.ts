import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ServiceType } from '../../domain/enums/service-type.enum';

export class CreateRequestDto {
  @IsUUID()
  vehicleId!: string;

  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @IsString()
  @MaxLength(500)
  pickupAddr!: string;

  @IsNumber()
  pickupLat!: number;

  @IsNumber()
  pickupLng!: number;

  @IsString()
  @MaxLength(500)
  dropAddr!: string;

  @IsOptional()
  @IsNumber()
  dropLat?: number;

  @IsOptional()
  @IsNumber()
  dropLng?: number;

  @IsDateString()
  scheduledAt!: string;

  @Min(0)
  @IsNumber()
  priceEst!: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zone?: string;
}
