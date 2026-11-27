/**
 * Browser-side client for the /api/laundry routes. Every response is parsed
 * against the shared schemas, and calls never throw: they return a result.
 */
import type { z } from "zod";
import {
  ApiErrorSchema,
  DisconnectResponseSchema,
  SessionResponseSchema,
  StatusResponseSchema,
} from "./schemas";
import type { ApiError, ConnectRequest, DisconnectRequest } from "./types";

const TIMEOUT_MS = 18_000;

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const NETWORK_ERROR: ApiError = {
  code: "NETWORK",
  message: "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.",
  retryAfter: 30,
};

const BAD_RESPONSE: ApiError = {
  code: "BAD_RESPONSE",
  message: "서버 응답을 읽지 못했어요. 서버가 실행 중인지 확인하고 페이지를 새로고침해 주세요.",
};

async function request<S extends z.ZodType>(path: string, schema: S, init: RequestInit = {}): Promise<ApiResult<z.infer<S>>> {
  let response: Response;

  try {
    response = await fetch(`/api/laundry/${path}`, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const error = ApiErrorSchema.safeParse(json);

    return { ok: false, error: error.success ? error.data : BAD_RESPONSE };
  }

  const body = schema.safeParse(json);

  return body.success ? { ok: true, data: body.data } : { ok: false, error: BAD_RESPONSE };
}

const postJson = (payload: ConnectRequest | DisconnectRequest): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

export const laundryApi = {
  session: () => request("session", SessionResponseSchema),
  status: () => request("status", StatusResponseSchema),
  connect: (token: string) => request("connect", StatusResponseSchema, postJson({ token })),
  disconnect: () => request("disconnect", DisconnectResponseSchema, postJson({})),
};
