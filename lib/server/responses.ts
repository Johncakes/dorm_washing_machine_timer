import "server-only";
import type { ApiError, ApiErrorCode } from "@/lib/laundry/types";
import { clearedSessionCookie } from "./session";
import { UpstreamError } from "./smartthings";

const BASE_HEADERS = {
  "Cache-Control": "no-store, private",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export function json<T>(data: T, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...BASE_HEADERS, ...headers } });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra: { retryAfter?: number; headers?: Record<string, string> } = {},
): Response {
  const body: ApiError = { code, message, ...(extra.retryAfter !== undefined && { retryAfter: extra.retryAfter }) };

  return json(body, status, extra.headers);
}

/** Maps a failed SmartThings read to a safe, user-facing Korean error. Never echoes upstream bodies. */
export function upstreamErrorResponse(error: unknown, secure: boolean): Response {
  const status = error instanceof UpstreamError ? error.status : 503;

  switch (status) {
    case 401:
      return apiError("TOKEN_EXPIRED", "토큰이 만료되었거나 유효하지 않아요. 새 토큰으로 다시 연결해 주세요.", 401, {
        headers: { "Set-Cookie": clearedSessionCookie(secure) },
      });
    case 403:
      return apiError("PERMISSION", "이 세탁기를 조회할 권한이 없어요. 같은 삼성 계정과 디바이스 보기 권한을 확인해 주세요.", 403);
    case 404:
      return apiError("DEVICE_NOT_FOUND", "5번 세탁기를 찾지 못했어요. 등록한 삼성 계정과 기기 연결을 확인해 주세요.", 404);
    case 402:
      return apiError("PLAN_REQUIRED", "삼성에서 API 이용 조건 또는 사용량 확인을 요청했어요. 자동 조회를 중지했습니다.", 402);
    case 429: {
      const retryAfter = (error as UpstreamError).retryAfter;

      return apiError("RATE_LIMIT", "조회 요청이 잠시 제한됐어요. 잠시 후 다시 확인합니다.", 429, {
        retryAfter,
        headers: { "Retry-After": String(retryAfter) },
      });
    }

    default:
      return apiError("UPSTREAM_UNAVAILABLE", "삼성에서 최신 상태를 받지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.", 503, {
        retryAfter: 30,
      });
  }
}
