import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginCarousel } from "@/components/LoginCarousel";
import { COOKIE, isAuthed, sessionCookieValue } from "@/lib/auth";
import { TEAM } from "@/lib/brand";

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
    <div className="login-shell brandastic-co">
      <section className="login-visual full-bleed">
        <LoginCarousel />
      </section>

      <section className="login-panel">
        <div className="login-card brandastic clean">
          <img
            src="/brand/mark-circle.png"
            alt="Brandastic"
            className="login-mark"
          />
          <div className="login-badge">dash.brandastic.com</div>
          <h2>Welcome back</h2>
          <p>
            Enter the team PIN to open Ads Dash — Meta + Google review for
            Brandastic and our clients.
          </p>

          <form action={loginAction} className="stack">
            <label className="field-label" htmlFor="pin">
              Access PIN
            </label>
            <input
              id="pin"
              className="input"
              type="password"
              name="pin"
              placeholder="••••"
              required
              autoFocus
            />
            {sp.error ? (
              <div className="badge warn">Incorrect PIN — try again</div>
            ) : (
              <div className="muted" style={{ fontSize: 12 }}>
                Team access only. Default PIN can be rotated via{" "}
                <code>DASH_ACCESS_PIN</code>.
              </div>
            )}
            <button className="btn primary wide" type="submit">
              Enter Ads Dash
            </button>
          </form>

          <div className="login-team-mini">
            {TEAM.slice(0, 6).map((m) => (
              <img key={m.name} src={m.image} alt={m.name} title={m.name} />
            ))}
          </div>

          <div className="login-foot">
            Review-only · No budgets, ads, or audiences can be changed here
          </div>
        </div>
      </section>
    </div>
  );
}
