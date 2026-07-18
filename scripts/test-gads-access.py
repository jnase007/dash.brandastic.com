#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
from pathlib import Path

env = {}
for line in Path(__file__).resolve().parents[1].joinpath(".env.local").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

data = urllib.parse.urlencode(
    {
        "client_id": env["GOOGLE_ADS_CLIENT_ID"],
        "client_secret": env["GOOGLE_ADS_CLIENT_SECRET"],
        "refresh_token": env["GOOGLE_ADS_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }
).encode()
req = urllib.request.Request(
    "https://oauth2.googleapis.com/token",
    data=data,
    method="POST",
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)
with urllib.request.urlopen(req, timeout=30) as resp:
    tok = json.loads(resp.read().decode())
access = tok.get("access_token")
print("access_token_ok", bool(access), "expires_in", tok.get("expires_in"))

for with_login in [False, True]:
    headers = {
        "Authorization": f"Bearer {access}",
        "developer-token": env["GOOGLE_ADS_DEVELOPER_TOKEN"],
        "Content-Type": "application/json",
    }
    if with_login:
        headers["login-customer-id"] = env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "2194135480")
    req = urllib.request.Request(
        "https://googleads.googleapis.com/v21/customers:listAccessibleCustomers",
        headers=headers,
        method="GET",
    )
    print("--- with_login", with_login, "---")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
            print("OK", json.dumps(body, indent=2)[:2000])
    except Exception as e:
        if hasattr(e, "read"):
            print("API error", getattr(e, "code", None))
            print(e.read().decode()[:1500])
        else:
            print("error", e)
