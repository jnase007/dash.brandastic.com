#!/usr/bin/env python3
"""Compare dash date-window math vs Google Ads Manager-style LAST_N_DAYS."""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env.local").read_text().splitlines():
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    os.environ[k.strip()] = v.strip().strip('"').strip("'")

data = urllib.parse.urlencode(
    {
        "client_id": os.environ["GOOGLE_ADS_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_ADS_CLIENT_SECRET"],
        "refresh_token": os.environ["GOOGLE_ADS_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }
).encode()
tok = json.loads(
    urllib.request.urlopen(
        urllib.request.Request(
            "https://oauth2.googleapis.com/token", data=data, method="POST"
        ),
        timeout=30,
    ).read()
)
access = tok["access_token"]
login = os.environ["GOOGLE_ADS_LOGIN_CUSTOMER_ID"].replace("-", "")
dev = os.environ["GOOGLE_ADS_DEVELOPER_TOKEN"]

la = ZoneInfo("America/Los_Angeles")
end_la = datetime.now(la)
start_la = end_la - timedelta(days=29)
since_la = start_la.strftime("%Y-%m-%d")
until_la = end_la.strftime("%Y-%m-%d")

# Bug simulation: local Date then toISOString (UTC date shift)
end_local_as_utc = datetime.now().astimezone(timezone.utc)  # not exact JS
# Exact-ish JS: construct local midnight-ish then toISOString
end_js = datetime.now(la)
start_js = end_js - timedelta(days=29)
since_utc_shift = start_js.astimezone(timezone.utc).strftime("%Y-%m-%d")
until_utc_shift = end_js.astimezone(timezone.utc).strftime("%Y-%m-%d")

print("now LA", end_la.isoformat())
print("LA window", since_la, until_la)
print("UTC-shift window", since_utc_shift, until_utc_shift)


def run(cid: str, query: str, label: str):
    body = json.dumps({"query": query}).encode()
    url = f"https://googleads.googleapis.com/v21/customers/{cid}/googleAds:searchStream"
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {access}",
            "developer-token": dev,
            "login-customer-id": login,
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
        spend = imps = clicks = conv = 0.0
        for r in rows:
            m = r.get("metrics") or {}
            spend += float(m.get("costMicros") or 0) / 1e6
            imps += float(m.get("impressions") or 0)
            clicks += float(m.get("clicks") or 0)
            conv += float(m.get("conversions") or 0)
        print(
            f"  {label}: rows={len(rows)} spend=${spend:,.2f} imps={imps:,.0f} "
            f"clicks={clicks:,.0f} conv={conv:,.2f}"
        )
        return spend
    except Exception as e:
        print(f"  {label} FAIL {e}")
        return None


cid = "6921457333"
print("\n=== Brandastic Google comparisons ===")
run(
    cid,
    """
SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
FROM customer WHERE segments.date DURING LAST_30_DAYS
""",
    "LAST_30_DAYS customer",
)
run(
    cid,
    f"""
SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
FROM customer WHERE segments.date BETWEEN '{since_la}' AND '{until_la}'
""",
    f"BETWEEN LA {since_la}..{until_la}",
)
run(
    cid,
    f"""
SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
FROM customer WHERE segments.date BETWEEN '{since_utc_shift}' AND '{until_utc_shift}'
""",
    f"BETWEEN UTC-shift {since_utc_shift}..{until_utc_shift}",
)
run(
    cid,
    f"""
SELECT campaign.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
FROM campaign
WHERE segments.date BETWEEN '{since_la}' AND '{until_la}'
  AND campaign.status != 'REMOVED'
""",
    "campaign BETWEEN LA (dash query style)",
)

# account timezone
try:
    q = "SELECT customer.id, customer.descriptiveName, customer.timeZone, customer.currencyCode FROM customer"
    body = json.dumps({"query": q}).encode()
    url = f"https://googleads.googleapis.com/v21/customers/{cid}/googleAds:searchStream"
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {access}",
            "developer-token": dev,
            "login-customer-id": login,
            "Content-Type": "application/json",
        },
    )
    raw = urllib.request.urlopen(req, timeout=30).read()
    j = json.loads(raw)
    batches = j if isinstance(j, list) else [j]
    for b in batches:
        for r in b.get("results") or []:
            print("account", r)
except Exception as e:
    print("account meta fail", e)

print("\n=== All mapped clients LAST_30_DAYS ===")
for cid, name in [
    ("6921457333", "Brandastic"),
    ("8877524330", "DESS"),
    ("2511043517", "Nordic"),
    ("1690254897", "CHPM"),
]:
    run(
        cid,
        """
SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
FROM customer WHERE segments.date DURING LAST_30_DAYS
""",
        name,
    )
