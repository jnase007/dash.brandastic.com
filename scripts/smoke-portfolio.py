#!/usr/bin/env python3
import json
import urllib.request

req = urllib.request.Request("https://dash.brandastic.com/api/portfolio?range=30d")
req.add_header("Cookie", "dash_brandastic_session=ok:3121")
r = urllib.request.urlopen(req, timeout=90)
body = r.read()
print("portfolio", r.status, len(body))
j = json.loads(body)
print("mode", j.get("mode"), "connection", j.get("connection"), "notes", j.get("notes"))
for c in j.get("clients") or []:
    client = c.get("client") or {}
    name = client.get("name") or c.get("name")
    camps = [x for x in (c.get("campaigns") or []) if x.get("platform") == "google"]
    src = c.get("source")
    notes = c.get("notes")
    print("- %s: source=%s google=%s g_camps=%s notes=%s" % (name, src, bool(c.get("google")), len(camps), notes))
    for x in camps[:3]:
        print("   ", x.get("name"), "spend", (x.get("metrics") or {}).get("spend"))
