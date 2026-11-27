import "server-only";
import { DEVICE_ID } from "./smartthings";

/** Session stored, encrypted, in the browser cookie. */
export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceId: string;
  expiresAt: number;
}

export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

// Secure (https) requests get the stricter __Host- cookie. Plain http://localhost
// cannot set Secure cookies in every browser, so it falls back to a normal name.
const SECURE_COOKIE = "__Host-laundry-session";
const PLAIN_COOKIE = "laundry-session";

// Binds ciphertexts to this purpose so they can't be replayed as another kind of value.
const AAD = new TextEncoder().encode("laundry-session/v1");
const MAX_COOKIE_LENGTH = 3800;

export const isValidSessionKey = (key: unknown): key is string => typeof key === "string" && /^[0-9a-f]{64}$/.test(key);

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function importKey(secret: string): Promise<CryptoKey> {
  if (!isValidSessionKey(secret)) throw new Error("Invalid LAUNDRY_SESSION_KEY");

  return crypto.subtle.importKey("raw", Buffer.from(secret, "hex"), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealSession(session: Session, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(session));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, await importKey(secret), plain);

  return `${base64url(iv)}.${base64url(new Uint8Array(cipher))}`;
}

/** Returns the session only if it decrypts, belongs to `userId`, targets our device, and hasn't expired. */
export async function openSession(
  value: string | undefined,
  secret: string,
  userId: string,
  now = Date.now(),
): Promise<Session | null> {
  try {
    if (!value || value.length > MAX_COOKIE_LENGTH) return null;
    const [iv, cipher, ...rest] = value.split(".");

    if (rest.length || !iv || !cipher) return null;

    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64url(iv), additionalData: AAD },
      await importKey(secret),
      fromBase64url(cipher),
    );

    const session = JSON.parse(new TextDecoder().decode(plain)) as Partial<Session>;

    const valid =
      session.userId === userId &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > now &&
      session.deviceId === DEVICE_ID &&
      typeof session.token === "string" &&
      typeof session.id === "string";

    return valid ? (session as Session) : null;
  } catch {
    return null;
  }
}

const cookieName = (secure: boolean) => (secure ? SECURE_COOKIE : PLAIN_COOKIE);
const cookieAttributes = (secure: boolean) => `Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Strict`;

export function sessionCookie(value: string, secure: boolean): string {
  return `${cookieName(secure)}=${value}; ${cookieAttributes(secure)}; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${cookieName(secure)}=; ${cookieAttributes(secure)}; Max-Age=0`;
}

export function readSessionCookie(request: Request, secure: boolean): string | undefined {
  const prefix = `${cookieName(secure)}=`;

  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

/** Decrypts the session cookie on `request`, or returns null if there is no valid session. */
export function loadSession(
  request: Request,
  ctx: { secure: boolean; sessionKey: string; userId: string },
): Promise<Session | null> {
  return openSession(readSessionCookie(request, ctx.secure), ctx.sessionKey, ctx.userId);
}
