#!/usr/bin/env python3
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

for line in Path(".env.local").read_text().splitlines():
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    os.environ[k] = v.strip().strip('"').strip("'")

data = urllib.parse.urlencode(
    {
        "client_id": os.environ["GOOGLE_ADS_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_ADS_CLIENT_SECRET"],
        "refresh_token": os.environ["GOOGLE_ADS_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }
).encode()
req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
tok = json.loads(urllib.request.urlopen(req, timeout=30).read())
access = tok["access_token"]
print("token ok")


def pull(cid: str, name: str) -> None:
    q = (
        "SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, "
        "metrics.impressions, metrics.clicks, metrics.conversions "
        "FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'"
    )
    body = json.dumps({"query": q}).encode()
    url = f"https://googleads.googleapis.com/v21/customers/{cid}/googleAds:searchStream"
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {access}",
            "developer-token": os.environ["GOOGLE_ADS_DEVELOPER_TOKEN"],
            "login-customer-id": os.environ["GOOGLE_ADS_LOGIN_CUSTOMER_ID"],
            "Content-Type": "application/json",
        },
    )
    try:
        raw = urllib.request.urlopen(req, timeout=60).read()
        j = json.loads(raw)
        batches = j if isinstance(j, list) else [j]
        rows = []
        for b in batches:
            rows.extend(b.get("results") or [])
        by = {}
        spend = 0.0
        for r in rows:
            cid_c = str(r.get("campaign", {}).get("id"))
            cost = float(r.get("metrics", {}).get("costMicros") or 0) / 1e6
            spend += cost
            by[cid_c] = r.get("campaign", {}).get("name")
        print(f"{name} ({cid}): campaigns={len(by)} spend30d=${spend:,.2f} sample={list(by.values())[:5]}")
    except Exception as e:\n        print(f"{name} FAIL {e}")


for cid, name in [
    ("6921457333", "Brandastic Adword"),
    ("8877524330", "DESS"),
    ("2511043517", "Nordic"),
    ("1690254897", "CHPM"),
]:
    pull(cid, name)
