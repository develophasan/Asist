import { IsOptional, IsString, Length } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @Length(3, 16)
  plate!: string;

  @IsString()
  @Length(1, 64)
  brand!: string;

  @IsString()
  @Length(1, 64)
  model!: string;

  @IsOptional()
  @IsString()
  fuel?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
