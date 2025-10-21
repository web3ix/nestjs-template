import { Uuid } from '@/common/types/uuid.type';

export type JwtRefreshPayloadType = {
  sessionId: Uuid;
  hash: string;
  iat: number;
  exp: number;
};
