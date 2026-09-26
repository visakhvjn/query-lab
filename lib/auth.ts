import { timingSafeEqual } from "crypto";

/**
 * Accepts Authorization: Bearer <secret> or X-Auth-Secret: <secret>
 */
export function assertAuthSecret(request: Request): void {
  const expected = process.env.AUTH_SECRET;
  if (!expected) {
    throw new AuthSecretError(
      "AUTH_SECRET is not configured on the server",
      500,
    );
  }

  const header =
    request.headers.get("x-auth-secret") ??
    bearerToken(request.headers.get("authorization"));

  if (!header || !safeEqual(header, expected)) {
    throw new AuthSecretError("Unauthorized", 401);
  }
}

function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export class AuthSecretError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthSecretError";
    this.status = status;
  }
}
