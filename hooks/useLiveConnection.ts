"use client";
import { useCallback, useEffect, useReducer } from "react";
import { laundryApi, toApiError } from "@/lib/laundry/api-client";
import type { LivePhase } from "@/lib/laundry/connection-copy";
import { LIVE_WASHER_ID, POLL_INTERVAL_MS, type ApiError, type LiveWasherState, type Machine } from "@/lib/laundry/types";
import { usePageVisible } from "./usePageVisible";


export interface Feedback {
  message: string;
  success: boolean;
}

interface State {
  /** A session exists and we should keep polling. */
  active: boolean;
  phase: LivePhase;
  /** Latest washer 5 reading, or an "unavailable" placeholder after a failed poll. */
  washer: Machine | null;
  lastChecked: string | null;
  lastDeviceUpdate: string | null;
  /** Overrides the default banner text (e.g. the last error). */
  notice: string | null;
  /** Message shown inside the connection dialog. */
  feedback: Feedback | null;
  connecting: boolean;
  disconnecting: boolean;
}

type Action =
  | { type: "sessionRestored" }
  | { type: "setupError"; message: string }
  | { type: "live"; state: LiveWasherState }
  | { type: "pollFailed"; error: ApiError }
  | { type: "connecting" }
  | { type: "connected"; state: LiveWasherState }
  | { type: "connectFailed"; error: ApiError }
  | { type: "disconnecting" }
  | { type: "disconnected" }
  | { type: "disconnectFailed"; error: ApiError }
  | { type: "feedback"; feedback: Feedback | null };

const initialState: State = {
  active: false,
  phase: "disconnected",
  washer: null,
  lastChecked: null,
  lastDeviceUpdate: null,
  notice: null,
  feedback: null,
  connecting: false,
  disconnecting: false,
};

/** Errors that mean the session is gone. */
const SESSION_ENDED = new Set(["TOKEN_EXPIRED", "NOT_CONNECTED"]);
/** Errors that retrying won't fix. */
const STOP_POLLING = new Set(["BAD_RESPONSE", "PLAN_REQUIRED", "PERMISSION"]);

function applyLive(state: State, live: LiveWasherState): State {
  return {
    ...state,
    active: true,
    phase: "connected",
    washer: { ...live, id: LIVE_WASHER_ID, live: true },
    lastChecked: live.checkedAt,
    lastDeviceUpdate: live.updatedAt,
    notice: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "sessionRestored":
      return { ...state, active: true };
    case "setupError":
      return { ...state, notice: action.message };
    case "live":
      return applyLive(state, action.state);
    case "pollFailed": {
      const { error } = action;
      const ended = SESSION_ENDED.has(error.code);
      return {
        ...state,
        active: state.active && !ended && !STOP_POLLING.has(error.code),
        phase: ended ? "expired" : "error",
        washer: { id: LIVE_WASHER_ID, status: "unavailable", course: "최신 정보를 확인하지 못했어요", live: true },
        notice: error.message,
        feedback: { message: error.message, success: false },
      };
    }
    case "connecting":
      return { ...state, connecting: true, feedback: null };
    case "connected":
      return {
        ...applyLive(state, action.state),
        connecting: false,
        feedback: { message: "5번 세탁기 연결을 확인했어요. 이제 10초마다 실제 상태를 확인합니다.", success: true },
      };
    case "connectFailed":
      return { ...state, connecting: false, feedback: { message: action.error.message, success: false } };
    case "disconnecting":
      return { ...state, disconnecting: true };
    case "disconnected":
      return {
        ...initialState,
        feedback: { message: "이 브라우저의 연결을 해제했어요. 삼성 기기 등록은 그대로 유지됩니다.", success: true },
      };
    case "disconnectFailed":
      return { ...state, disconnecting: false, feedback: { message: action.error.message, success: false } };
    case "feedback":
      return { ...state, feedback: action.feedback };
  }
}

/** Backoff after a failed poll: the server's hint, clamped to 10 s – 5 min. */
const retryDelay = (error: ApiError) => Math.max(POLL_INTERVAL_MS, Math.min(300_000, (error.retryAfter ?? 30) * 1000));

/**
 * Owns the SmartThings session: restores it on load, polls while the tab is
 * visible, backs off on errors, and exposes connect/disconnect.
 */
export function useLiveConnection() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const visible = usePageVisible();

  // Restore an existing session on load.
  useEffect(() => {
    let cancelled = false;
    laundryApi.session().then(
      (session) => {
        if (!cancelled && session.connected) dispatch({ type: "sessionRestored" });
      },
      (error) => {
        const apiError = toApiError(error, "");
        if (!cancelled && (apiError.code === "SERVER_SETUP" || apiError.code === "LOCAL_ONLY"))
          dispatch({ type: "setupError", message: apiError.message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll while connected and visible. Becoming visible again polls immediately.
  // Right after connect this first poll is served from the server's cache, not Samsung.
  useEffect(() => {
    if (!state.active || !visible) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      let delay = POLL_INTERVAL_MS;
      try {
        const body = await laundryApi.status();
        if (!cancelled) dispatch({ type: "live", state: body.state });
      } catch (error) {
        const apiError = toApiError(error, "최신 정보를 확인하지 못했어요.");
        if (!cancelled) dispatch({ type: "pollFailed", error: apiError });
        delay = retryDelay(apiError);
      }
      if (!cancelled) timer = setTimeout(poll, delay);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.active, visible]);

  const connect = useCallback(async (token: string) => {
    dispatch({ type: "connecting" });
    try {
      const body = await laundryApi.connect(token);
      dispatch({ type: "connected", state: body.state });
    } catch (error) {
      dispatch({ type: "connectFailed", error: toApiError(error, "연결하지 못했어요. 다시 시도해 주세요.") });
    }
  }, []);

  const disconnect = useCallback(async () => {
    dispatch({ type: "disconnecting" });
    try {
      await laundryApi.disconnect();
      dispatch({ type: "disconnected" });
    } catch (error) {
      dispatch({ type: "disconnectFailed", error: toApiError(error, "연결 해제를 완료하지 못했어요.") });
    }
  }, []);

  const setFeedback = useCallback((feedback: Feedback | null) => dispatch({ type: "feedback", feedback }), []);

  return { ...state, visible, connect, disconnect, setFeedback };
}

export type LiveConnection = ReturnType<typeof useLiveConnection>;
