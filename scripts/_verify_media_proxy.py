#!/usr/bin/env python3
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

env = {}
for line in Path(__file__).resolve().parents[1].joinpath(".env.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

token = env["META_ACCESS_TOKEN"]
ver = env.get("META_API_VERSION", "v21.0")
campaign_id = "52535659888309"

fields = (
    "id,name,status,effective_status,"
    "creative{id,name,title,body,image_url,thumbnail_url,video_id,"
    "effective_object_story_id,image_hash,object_story_spec}"
)
url = (
    f"https://graph.facebook.com/{ver}/{campaign_id}/ads"
    f"?fields={urllib.parse.quote(fields)}&limit=5&access_token={token}"
)
with urllib.request.urlopen(url, timeout=60) as r:\n    ads = json.load(r).get("data") or []

print("ads", len(ads))
sample_urls = []
for ad in ads[:3]:
    c = ad.get("creative") or {}
    print("\nAD", ad.get("id"), ad.get("name"))
    print(" thumb", (c.get("thumbnail_url") or "")[:120])
    print(" image", (c.get("image_url") or "")[:120])
    print(" video_id", c.get("video_id"))
    print(" story", c.get("effective_object_story_id"))
    if c.get("thumbnail_url"):
        sample_urls.append(c.get("thumbnail_url"))

    if c.get("video_id"):
        vurl = (
            f"https://graph.facebook.com/{ver}/{c['video_id']}"
            f"?fields=id,picture,source,thumbnails.limit(3){{uri,is_preferred,width,height}}"
            f"&access_token={token}"
        )
        try:
            with urllib.request.urlopen(vurl, timeout=60) as vr:
                video = json.load(vr)
            print(" video.picture", (video.get("picture") or "")[:120])
            print(" video.source", "yes" if video.get("source") else "no")
            if video.get("source"):
                sample_urls.append(video.get("source"))
            if video.get("picture"):
                sample_urls.append(video.get("picture"))
            thumbs = (video.get("thumbnails") or {}).get("data") or []
            for t in thumbs[:3]:
                print(
                    "  thumb",
                    t.get("is_preferred"),
                    t.get("width"),
                    t.get("height"),
                    (t.get("uri") or "")[:100],
                )
                if t.get("uri"):
                    sample_urls.append(t.get("uri"))
        except Exception as e:\n            print(" video resolve fail", e)

    story = c.get("effective_object_story_id")
    if story:
        purl = (
            f"https://graph.facebook.com/{ver}/{story}"
            f"?fields=id,full_picture,from{{name,picture.width(200).height(200)}}"
            f"&access_token={token}"
        )
        try:
            with urllib.request.urlopen(purl, timeout=60) as pr:
                post = json.load(pr)
            print(" post.full_picture", (post.get("full_picture") or "")[:120])
            if post.get("full_picture"):
                sample_urls.append(post.get("full_picture"))
            print(" from", (post.get("from") or {}).get("name"))
            pic = ((post.get("from") or {}).get("picture") or {}).get("data") or {}
            print(" page_pic", (pic.get("url") or "")[:120])
            if pic.get("url"):
                sample_urls.append(pic.get("url"))
        except Exception as e:\n            print(" post resolve fail", e)

print("\n=== proxy tests ===")
for raw in sample_urls[:5]:
    proxy = "https://dash.brandastic.com/api/meta/media?url=" + urllib.parse.quote(
        raw, safe=""
    )
    print("\nRAW", raw[:110])
    try:
        req = urllib.request.Request(
            raw,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://www.facebook.com/",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:\n            b = r.read(3000)\n            print("direct", r.status, r.headers.get("content-type"), "snip", len(b))
    except Exception as e:\n        print("direct FAIL", type(e).__name__, e)

    try:
        urllib.request.urlopen(proxy, timeout=30)
        print("proxy unauth unexpected ok")
    except urllib.error.HTTPError as e:\n        print("proxy unauth", e.code)

    req = urllib.request.Request(
        proxy,
        headers={"Cookie": "dash_brandastic_session=ok:3121", "User-Agent": "qa"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:\n            data = r.read()\n            print(\n                "proxy authed",
                r.status,
                r.headers.get("content-type"),
                "bytes",
                len(data),
            )
    except urllib.error.HTTPError as e:\n        body = e.read().decode("utf-8", "ignore")
        print("proxy authed FAIL", e.code, body[:250])
