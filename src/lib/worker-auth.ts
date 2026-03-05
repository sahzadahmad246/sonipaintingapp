import crypto from "crypto";
import { cookies } from "next/headers";

export const WORKER_SESSION_COOKIE = "worker_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type WorkerSessionPayload = {
  workerId: string;
  mobile: string;
  role: "worker";
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return Buffer.from(padded, "base64").toString("utf8");
}

function getSecret() {
  return process.env.WORKER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function createWorkerSessionToken(workerId: string, mobile: string) {
  const secret = getSecret();
  if (!secret) throw new Error("Missing WORKER_AUTH_SECRET or NEXTAUTH_SECRET");

  const payload: WorkerSessionPayload = {
    workerId,
    mobile,
    role: "worker",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyWorkerSessionToken(token: string): WorkerSessionPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadPart, signaturePart] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signaturePart);
  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  const payload = JSON.parse(base64UrlDecode(payloadPart)) as WorkerSessionPayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.role !== "worker") return null;

  return payload;
}

export async function getWorkerSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(WORKER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyWorkerSessionToken(token);
}

export function workerSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
