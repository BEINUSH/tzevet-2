"use server";

import { cookies } from "next/headers";

const ADMIN_COOKIE = "tzevet_admin";
const ADMIN_CODE = "4466";

export async function loginAdmin(code: string): Promise<{ ok: boolean }> {
  if (code.trim() !== ADMIN_CODE) return { ok: false };

  (await cookies()).set(ADMIN_COOKIE, "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 12,
  });
  return { ok: true };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await cookies()).get(ADMIN_COOKIE)?.value === "granted";
}
