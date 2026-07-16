import { cookies } from "next/headers";

const COOKIE = "dash_brandastic_session";

export async function isAuthed() {
  const jar = await cookies();
  const val = jar.get(COOKIE)?.value;
  const pin = process.env.DASH_ACCESS_PIN || "3121";
  return val === `ok:${pin}`;
}

export function sessionCookieValue(pin: string) {
  return `ok:${pin}`;
}

export { COOKIE };
