import { createHmac, timingSafeEqual } from "crypto";

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  throw new Error("CRITICAL: JWT_SECRET environment variable is not set");
})();
const ADMIN_PASSWORD: string = process.env.ADMIN_PASSWORD || (() => {
  throw new Error("CRITICAL: ADMIN_PASSWORD environment variable is not set");
})();

// ========== JWT ==========

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export interface TokenPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/** 签发 JWT（7 天有效） */
export function signToken(): string {
  const header = base64urlEncode(
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  );
  const payload = base64urlEncode(
    Buffer.from(
      JSON.stringify({
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      } satisfies TokenPayload)
    )
  );
  const signature = base64urlEncode(
    createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

/** 验证 JWT，失败返回 null */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const expectedSig = base64urlEncode(
      createHmac("sha256", JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest()
    );

    const sigOk = timingSafeEqual(
      Buffer.from(sigB64, "base64url"),
      Buffer.from(expectedSig, "base64url")
    );
    if (!sigOk) return null;

    const payload: TokenPayload = JSON.parse(
      base64urlDecode(payloadB64).toString("utf-8")
    );

    // 检查过期
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ========== 密码验证 ==========

/** 服务端密码验证（防时序攻击） */
export function verifyPassword(input: string): boolean {
  const bufA = Buffer.from(input);
  const bufB = Buffer.from(ADMIN_PASSWORD);
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ========== 从请求中校验 ==========

/** 从 Authorization header 提取并验证 token */
export function getAuthFromRequest(req: Request): boolean {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return verifyToken(token) !== null;
}
