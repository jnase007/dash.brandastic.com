#!/usr/bin/env python3
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

env = {}
for line in Path(__file__).resolve().parents[1].joinpath(".env.local").read_text().splitlines():
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

token = env.get("META_ACCESS_TOKEN") or env.get("META_TOKEN")
act = env.get("META_ACT_BRANDASTIC")
print("meta token", bool(token), "act", act)
if not token or not act:
    print("keys", [k for k in env if "META" in k])
    raise SystemExit(1)
act = act if str(act).startswith("act_") else f"act_{act}"

la = ZoneInfo("America/Los_Angeles")
end = datetime.now(la).date()
start = end - timedelta(days=29)
since, until = str(start), str(end)
end_y = end - timedelta(days=1)
start_y = end_y - timedelta(days=29)


def pull(params, label):
    q = urllib.parse.urlencode(
        {**params, "access_token": token, "fields": "spend,impressions,clicks"}
    )
    url = f"https://graph.facebook.com/v21.0/{act}/insights?{q}"
    try:
        j = json.loads(urllib.request.urlopen(url, timeout=30).read())
        row = (j.get("data") or [{}])[0]
        print(label, row)
    except Exception as e:
        print(label, "FAIL", e)


pull({"date_preset": "last_30d", "level": "account"}, "preset last_30d")
pull({"date_preset": "last_7d", "level": "account"}, "preset last_7d")
pull(
    {"time_range": json.dumps({"since": since, "until": until}), "level": "account"},
    f"custom today-end {since}..{until}",
)
pull(
    {
        "time_range": json.dumps({"since": str(start_y), "until": str(end_y)}),
        "level": "account",
    },
    f"custom yest-end {start_y}..{end_y}",
)
