/** Browser-side client for the /api/laundry routes. Throws `ApiError` on failure. */
import type { ApiError, DisconnectResponse, SessionResponse, StatusResponse } from "./types";

const TIMEOUT_MS = 18_000;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/laundry/${path}`, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw { code: "NETWORK", message: "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.", retryAfter: 30 } satisfies ApiError;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw {
      code: "BAD_RESPONSE",
      message: "서버 응답을 읽지 못했어요. 서버가 실행 중인지 확인하고 페이지를 새로고침해 주세요.",
    } satisfies ApiError;
  }
  if (!response.ok) throw body as ApiError;
  return body as T;
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const laundryApi = {
  session: () => request<SessionResponse>("session"),
  status: () => request<StatusResponse>("status"),
  connect: (token: string) => request<StatusResponse>("connect", postJson({ token })),
  disconnect: () => request<DisconnectResponse>("disconnect", postJson({})),
};

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

export function toApiError(error: unknown, fallback: string): ApiError {
  return isApiError(error) ? error : { code: "NETWORK", message: fallback };
}
