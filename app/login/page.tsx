import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
    <div className="login-shell">
      <section className="login-visual">
        <div className="login-visual-inner">
          <img
            src="/brand/logo-export.svg"
            alt="Brandastic"
            className="login-logo-light"
          />
          <div className="login-kicker">Team + client ads review</div>
          <h1 className="login-visual-title">
            A premium ads war room
            <span> for team + clients.</span>
          </h1>
          <p className="login-visual-copy">
            Priority inbox, branded client reports, and AI recommendations —
            built to replace AgencyAnalytics with a Brandastic experience. Review
            only. No campaign edits from this app.
          </p>

          <div className="login-photo-grid">
            <div className="login-photo large">
              <img src="/team/office-team.webp" alt="Brandastic team" />
            </div>
            <div className="login-photo">
              <img src="/team/justin-portrait.webp" alt="Justin Nase" />
            </div>
            <div className="login-photo">
              <img src="/team/office-3.jpg" alt="Brandastic office" />
            </div>
          </div>

          <div className="login-team-row">
            {TEAM.map((m) => (
              <div key={m.name} className="login-team-chip">
                <img src={m.image} alt={m.name} />
                <div>
                  <strong>{m.name}</strong>
                  <span>{m.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card brandastic">
          <img
            src="/brand/logo-black.png"
            alt="Brandastic"
            className="login-logo-dark"
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

          <div className="login-foot">
            Review-only · No budgets, ads, or audiences can be changed here
          </div>
        </div>
      </section>
    </div>
  );
}
