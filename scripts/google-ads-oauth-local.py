#!/usr/bin/env python3
"""Local Google Ads OAuth helper matching Brandastic gmp-cli setup.

Redirect URI (must be in GCP exactly):
  http://localhost:3847/callback

Reads credentials from:
  1) ~/.config/gmp-cli/.env  (GMP_*)
  2) dash.brandastic.com/.env.local (GOOGLE_ADS_*)

Writes:
  ~/.config/gmp-cli/tokens.json
  dash.brandastic.com/.env.local.google-oauth-result (refresh token line)
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DASH_ENV = ROOT / ".env.local"
GMP_DIR = Path.home() / ".config" / "gmp-cli"
GMP_ENV = GMP_DIR / ".env"
TOKENS_PATH = GMP_DIR / "tokens.json"
RESULT_PATH = ROOT / ".env.local.google-oauth-result"

PORT = int(os.environ.get("GADS_OAUTH_PORT", "3847"))
# Match SETUP-SERVIDOR.md / gmp-cli exactly
REDIRECT_URI = f"http://localhost:{PORT}/callback"
SCOPE = "https://www.googleapis.com/auth/adwords"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def load_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def resolve_creds() -> dict[str, str]:
    gmp = load_env_file(GMP_ENV)
    dash = load_env_file(DASH_ENV)
    client_id = (
        gmp.get("GMP_CLIENT_ID")
        or dash.get("GOOGLE_ADS_CLIENT_ID")
        or os.environ.get("GMP_CLIENT_ID")
        or os.environ.get("GOOGLE_ADS_CLIENT_ID")
        or ""
    )
    client_secret = (
        gmp.get("GMP_CLIENT_SECRET")
        or dash.get("GOOGLE_ADS_CLIENT_SECRET")
        or os.environ.get("GMP_CLIENT_SECRET")
        or os.environ.get("GOOGLE_ADS_CLIENT_SECRET")
        or ""
    )
    developer_token = (
        gmp.get("GMP_DEVELOPER_TOKEN")
        or dash.get("GOOGLE_ADS_DEVELOPER_TOKEN")
        or os.environ.get("GMP_DEVELOPER_TOKEN")
        or os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
        or ""
    )
    login_customer_id = (
        gmp.get("GMP_LOGIN_CUSTOMER_ID")
        or dash.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID")
        or ""
    )
    if not client_id or not client_secret:
        raise SystemExit(
            "Missing client id/secret. Put GMP_* in ~/.config/gmp-cli/.env "
            "or GOOGLE_ADS_* in dash .env.local"
        )
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "developer_token": developer_token,
        "login_customer_id": login_customer_id,
    }


STATE = secrets.token_urlsafe(24)
RESULT: dict = {}
SERVER: HTTPServer | None = None
CREDS = resolve_creds()


def auth_link() -> str:
    params = {
        "client_id": CREDS["client_id"],
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": STATE,
    }
    return f"{AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code(code: str) -> dict:
    data = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": CREDS["client_id"],
            "client_secret": CREDS["client_secret"],
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    ).encode()
    req = urllib.request.Request(
        TOKEN_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def save_tokens(tokens: dict) -> None:
    GMP_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "access_token": tokens.get("access_token"),
        "refresh_token": tokens.get("refresh_token"),
        "scope": tokens.get("scope", SCOPE),
        "token_type": tokens.get("token_type", "Bearer"),
        "expiry_date": int(time.time() * 1000)
        + int(tokens.get("expires_in", 3600)) * 1000
        if tokens.get("access_token")
        else None,
        "obtained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "redirect_uri": REDIRECT_URI,
    }
    TOKENS_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    os.chmod(TOKENS_PATH, 0o600)

    refresh = tokens.get("refresh_token") or ""
    RESULT_PATH.write_text(
        "\n".join(
            [
                f"GOOGLE_ADS_REFRESH_TOKEN={refresh}",
                f"# access_token_received={bool(tokens.get('access_token'))}",
                f"# scope={tokens.get('scope', '')}",
                f"# token_type={tokens.get('token_type', '')}",
                f"# expires_in={tokens.get('expires_in', '')}",
                f"# tokens_json={TOKENS_PATH}",
                "",
            ]
        )
    )
    os.chmod(RESULT_PATH, 0o600)


def ensure_gmp_env() -> None:
    """Seed ~/.config/gmp-cli/.env from dash env if missing (no overwrite of secrets)."""
    GMP_DIR.mkdir(parents=True, exist_ok=True)
    if GMP_ENV.exists():
        return
    lines = [
        f"GMP_CLIENT_ID={CREDS['client_id']}",
        f"GMP_CLIENT_SECRET={CREDS['client_secret']}",
        f"GMP_DEVELOPER_TOKEN={CREDS['developer_token']}",
        f"GMP_LOGIN_CUSTOMER_ID={CREDS['login_customer_id']}",
        "",
    ]
    GMP_ENV.write_text("\n".join(lines))
    os.chmod(GMP_ENV, 0o600)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _html(self, title: str, body: str, code: int = 200) -> None:
        html = f"""<!doctype html>
<html><head><meta charset='utf-8'><title>{title}</title>
<style>
body{{font-family:Inter,system-ui,sans-serif;max-width:720px;margin:48px auto;padding:0 16px;color:#0f172a;line-height:1.5}}
.ok{{color:#047857}}.err{{color:#b91c1c}} code{{background:#f1f5f9;padding:2px 6px;border-radius:6px}}
a.btn{{display:inline-block;margin-top:12px;background:#0f172a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none}}
</style></head><body><h1>{title}</h1>{body}</body></html>"""
        data = html.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/", "/start", "/login"):
            link = auth_link()
            self._html(
                "Google Ads OAuth (gmp-cli compatible)",
                f"<p>Redirect URI: <code>{REDIRECT_URI}</code></p>"
                f"<p><a class='btn' href='{link}'>Continue to Google</a></p>"
                "<p>Use a Google account with access to MCC <code>2194135480</code>.</p>",
            )
            return

        if parsed.path != "/callback":
            self._html(
                "Not found",
                f"<p>Expected callback path <code>/callback</code>. Got <code>{parsed.path}</code>.</p>",
                404,
            )
            return

        qs = urllib.parse.parse_qs(parsed.query)
        if qs.get("error"):
            err = qs.get("error", ["unknown"])[0]
            desc = qs.get("error_description", [""])[0]
            RESULT["error"] = f"{err}: {desc}".strip(": ")
            self._html("OAuth failed", f"<p class='err'>{RESULT['error']}</p>")
            threading.Thread(target=shutdown_soon, daemon=True).start()
            return

        state = (qs.get("state") or [""])[0]
        code = (qs.get("code") or [""])[0]
        if state != STATE or not code:
            RESULT["error"] = "Invalid state or missing code"
            self._html("OAuth failed", f"<p class='err'>{RESULT['error']}</p>", 400)
            threading.Thread(target=shutdown_soon, daemon=True).start()
            return

        try:
            tokens = exchange_code(code)
            RESULT.update(tokens)
            save_tokens(tokens)
            if tokens.get("refresh_token"):
                body = (
                    "<p class='ok'><strong>Success.</strong> Tokens saved.</p>"
                    f"<p><code>{TOKENS_PATH}</code></p>"
                    f"<p><code>{RESULT_PATH.name}</code></p>"
                    "<p>You can close this tab. Chip will test a read-only Ads pull next.</p>"
                )
            else:
                body = (
                    "<p class='err'><strong>Signed in, but no refresh_token returned.</strong></p>"
                    "<p>Revoke the app at "
                    "<a href='https://myaccount.google.com/permissions' target='_blank'>Google Account permissions</a> "
                    "and retry (needs prompt=consent + access_type=offline).</p>"
                )
            self._html("Google Ads OAuth complete", body)
        except Exception as e:  # noqa: BLE001
            RESULT["error"] = str(e)
            self._html("OAuth failed", f"<p class='err'>{RESULT['error']}</p>", 500)

        threading.Thread(target=shutdown_soon, daemon=True).start()


def shutdown_soon() -> None:
    time.sleep(0.4)
    if SERVER is not None:
        SERVER.shutdown()


def main() -> int:
    global SERVER
    ensure_gmp_env()
    link = auth_link()
    SERVER = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Listening on http://localhost:{PORT}")
    print(f"Redirect URI: {REDIRECT_URI}")
    print("Open this URL to authorize Google Ads:")
    print(link)
    print(f"Tokens path: {TOKENS_PATH}")
    try:
        SERVER.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        SERVER.server_close()

    if RESULT.get("error"):
        print("ERROR:", RESULT["error"], file=sys.stderr)
        return 1
    if RESULT.get("refresh_token"):
        print("OK: refresh_token saved")
        return 0
    if RESULT.get("access_token"):
        print("WARN: access_token only (no refresh_token)")
        return 2
    print("No result captured")
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
