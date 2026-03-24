import { IsNumber, IsOptional, Min } from 'class-validator';

export class DispatchRequestDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDistanceKm?: number;
}
