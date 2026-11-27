# 율곡관 세탁실 연결 테스트

The dashboard has a SmartThings connection dialog and runs on the owner's own machine. Samsung read-only access is tested against washer 5; the other nine devices are unconnected.

## Runtime configuration

`LAUNDRY_SESSION_KEY` is a 32-byte encryption key represented as 64 lowercase hex characters. Generate it with `npm run gen-key > .env.local`; the file is git-ignored. Without it, the server uses a temporary key and sessions end on restart. Never put a Samsung PAT in source, runtime configuration files, browser storage, logs, or a chat message. The owner enters the PAT in the connection dialog instead.

## Session and request behavior

- The API answers only requests whose Host is `localhost`, `127.0.0.1` or `[::1]`, and uses a single fixed local identity. POST endpoints require the same Origin and JSON content type.
- A successful connection verifies the fixed washer with read-only Samsung GET requests. It encrypts the PAT and session using AES-GCM in an HttpOnly, SameSite=Strict cookie (`__Host-` and Secure when served over HTTPS). The original PAT is not returned in the JSON response.
- The session is scoped to this browser for at most 24 hours. The PAT still expires 24 hours after its original issuance, which may happen earlier. API 401 clears the cookie.
- Visible pages poll every 10 seconds. The server coalesces/cache-reuses status reads for 8 seconds per session. Hidden pages stop polling. Missing or unavailable data is never converted into a countdown or a zero-minute estimate.
- Device health is read when available. A reported offline device suppresses remaining time. This prototype does not infer laundry collection or diagnose faults.
- The timestamps distinguish when this service checked Samsung from when Samsung last recorded the device attribute. Polling cannot increase the washer's own reporting frequency.
- The disconnect button removes only this browser's session, never Samsung device registration.

## Checks

`node --test tests/laundry-server.test.mjs` covers identity, CSRF, encryption, isolation, expiration, real-value normalization, missing data, offline and pause states, upstream rate limits, and disconnect behavior using a mock Samsung response. A real end-to-end Samsung check requires the owner to enter their PAT in the locally running app.

## Production follow-up

This is a single-user local test, not a shared dorm service. Institution-owned Samsung access, persistent OAuth credentials, centralized event delivery/cache, and hosting ownership must be established before student rollout. Do not expose this local server to a network as a substitute for implementing real authentication. The static design's artificial examples are clearly marked and hidden while a live session is connected.
