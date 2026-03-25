import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { UserRole } from '../../domain/enums/user-role.enum';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  phone!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @Length(2, 64)
  purpose!: string;

  @IsString()
  @Length(2, 64)
  @IsOptional()
  pushToken?: string;
}
