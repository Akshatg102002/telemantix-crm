export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

export interface SocketEvents {
  // Server → Client
  'lead:assigned': { leadId: string; agentId: string; agentName: string };
  'lead:status_changed': { leadId: string; statusId: string; statusName: string };
  'follow_up:reminder': { followUpId: string; leadId: string; scheduledAt: string };
  'notification:new': { id: string; title: string; body: string; type: string };
  'activity:new': { type: string; payload: unknown; createdAt: string };
  // Client → Server
  'room:join': { tenantId: string };
  'room:leave': { tenantId: string };
}

export interface LeadScoreRule {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: unknown;
  weight: number;
}

export interface WebhookPayload {
  event: string;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
