import { Uuid } from '@/common/types/uuid.type';
import { Role } from '@/constants/auth.constant';

export type JwtPayloadType = {
  id: Uuid;
  role: Role;
  sessionId: Uuid;
  iat: number;
  exp: number;
};
