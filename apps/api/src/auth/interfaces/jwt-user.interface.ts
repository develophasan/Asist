import { UserRole } from '../../domain/enums/user-role.enum';

export interface JwtUser {
  sub: string;
  phone: string;
  role: UserRole;
}
