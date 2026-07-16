import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, isAuthed, sessionCookieValue } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  const pin = String(formData.get("pin") || "");
  const expected = process.env.DASH_ACCESS_PIN || "3121";
  if (pin !== expected) {
    redirect("/login?error=1");
  }
  const jar = await cookies();
  jar.set(COOKIE, sessionCookieValue(pin), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthed()) redirect("/");
  const sp = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand-mark" style={{ width: 42, height: 42 }}>
          B
        </div>
        <h1>Brandastic Ads Dash</h1>
        <p>
          Review Meta + Google Ads performance for the team and clients. Access
          is PIN-gated for v1.
        </p>
        <form action={loginAction} className="stack">
          <input
            className="input"
            type="password"
            name="pin"
            placeholder="Access PIN"
            required
          />
          {sp.error ? (
            <div className="badge warn">Incorrect PIN</div>
          ) : (
            <div className="muted" style={{ fontSize: 12 }}>
              Default team PIN can be changed via DASH_ACCESS_PIN.
            </div>
          )}
          <button className="btn primary" type="submit">
            Enter dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
