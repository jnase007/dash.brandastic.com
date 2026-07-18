#!/usr/bin/env python3
from __future__ import annotations
import json, sys, urllib.error, urllib.request
BASE = "https://dash.brandastic.com"
COOKIE = "dash_brandastic_session=ok:3121"

def hit(path, cookie=None):
    headers = {"User-Agent": "dash-qa-smoke"}
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(BASE + path, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            body = res.read()
            ct = res.headers.get("content-type", "")
            data = json.loads(body) if "json" in ct else body[:120]
            return res.status, data
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            data = json.loads(body)
        except Exception:
            data = body[:120].decode("utf-8", "replace")
        return e.code, data

def main():
    print("== unauth ==")
    for path in ["/api/health","/api/portfolio","/api/insights","/api/meta/accounts","/api/logos/dess-usa"]:
        status, data = hit(path)
        summary = data if not isinstance(data, dict) else {k: data.get(k) for k in list(data)[:5]}
        print(status, path, summary)
    print()
    print("== portfolio ==")
    status, data = hit("/api/portfolio?range=30d", cookie=COOKIE)
    print("status", status)
    if status != 200:
        print(data); return 1
    print("mode", data.get("mode"))
    print("connection", data.get("connection"))
    print("range", data.get("range"))
    totals = data.get("totals") or {}
    print("totals", {k: totals.get(k) for k in ["spend","clicks","conversions","cpa","roas","ctr"]})
    print("notes", data.get("notes"))
    print("generatedAt", data.get("generatedAt"))
    for row in data.get("clients") or []:
        client = row.get("client") or {}
        combined = row.get("combined") or {}
        print(f"- {client.get('name')}: source={row.get('source')} status={client.get('status')} spend={combined.get('spend')} conv={combined.get('conversions')} meta={bool(client.get('metaAccountId'))} gads={bool(client.get('googleCustomerId'))} camps={len(row.get('campaigns') or [])} notes={row.get('notes')}")
    print()
    print("== insights authed ==")
    status, data = hit("/api/insights?range=30d&limit=5", cookie=COOKIE)
    print(status, data if not isinstance(data, dict) else {k: data.get(k) for k in ["ok","engine","model","count","note","error"]})
    if isinstance(data, dict):
        for item in (data.get("insights") or [])[:3]:
            print(" ", item.get("severity"), item.get("clientName"), item.get("title"))
    print()
    print("== page gates ==")
    for path in ["/", "/login", "/clients", "/insights", "/reports"]:
        status, _ = hit(path)
        print(status, path)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
