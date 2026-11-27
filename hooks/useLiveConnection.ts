"use client";

import { useCallback, useEffect, useReducer } from "react";
import { laundryApi } from "@/lib/laundry/api-client";
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
    void laundryApi.session().then((result) => {
      if (cancelled) return;

      if (result.ok) {
        if (result.data.connected) dispatch({ type: "sessionRestored" });
      } else if (result.error.code === "SERVER_SETUP" || result.error.code === "LOCAL_ONLY") {
        dispatch({ type: "setupError", message: result.error.message });
      }
    });

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
      const result = await laundryApi.status();

      if (cancelled) return;

      if (result.ok) dispatch({ type: "live", state: result.data.state });
      else dispatch({ type: "pollFailed", error: result.error });

      timer = setTimeout(poll, result.ok ? POLL_INTERVAL_MS : retryDelay(result.error));
    };

    void poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.active, visible]);

  const connect = useCallback(async (token: string) => {
    dispatch({ type: "connecting" });

    const result = await laundryApi.connect(token);

    if (result.ok) dispatch({ type: "connected", state: result.data.state });
    else dispatch({ type: "connectFailed", error: result.error });
  }, []);

  const disconnect = useCallback(async () => {
    dispatch({ type: "disconnecting" });

    const result = await laundryApi.disconnect();

    if (result.ok) dispatch({ type: "disconnected" });
    else dispatch({ type: "disconnectFailed", error: result.error });
  }, []);

  const setFeedback = useCallback((feedback: Feedback | null) => dispatch({ type: "feedback", feedback }), []);

  return { ...state, visible, connect, disconnect, setFeedback };
}

export type LiveConnection = ReturnType<typeof useLiveConnection>;
