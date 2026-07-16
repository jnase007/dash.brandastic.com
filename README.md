# dash.brandastic.com

Brandastic Ads Dashboard for **team + client review** of Meta + Google Ads.

Built to **replace AgencyAnalytics** for Brandastic: portfolio review, client-branded reports, and AI recommendations from campaign data.

## What it is
- Look/feel inspired by [brandastic.co](https://brandastic.co/) (login with team photos, left nav + updates, Inter, blue/cyan/purple accents)
- Multi-client portfolio overview
- Client detail pages with Meta vs Google split
- **AI Insights** — data-driven recommendations (CPA, ROAS, CTR, zero-conversion spend, channel gaps)
- **Custom client reports** — branded narrative + metrics + campaign table + next actions
- Campaign tables
- Date ranges: 7d / 30d / 90d
- PIN gate for v1 access
- **Read-only / review-only** — no ad create/edit/pause/budget changes

## Stack
- Next.js App Router
- TypeScript
- Vercel-ready

## Local
```bash
cd dash.brandastic.com
cp .env.example .env.local
npm install
npm run dev
```

Default PIN: `3121` (override with `DASH_ACCESS_PIN`)

## Env
See `.env.example`.

### Meta (required for live Meta)
- `META_ACCESS_TOKEN` — read/audit token from Jonathan
- Optional per-client: `META_ACT_BRANDASTIC`, `META_ACT_FRIAR_TUX`, etc.

### Google Ads (required for live Google)
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (MCC)
- Optional per-client customer IDs: `GADS_BRANDASTIC`, `GADS_FRIAR_TUX`, etc.

Without tokens, the UI runs in **demo mode** so team can review layout/flow immediately.

## Deploy (Vercel)
1. Repo: https://github.com/jnase007/dash.brandastic.com
2. Project: `dash-brandastic` under `nase007s-projects`
3. Set env vars
4. Domain `dash.brandastic.com`
   - Cloudflare DNS: `dash` CNAME → `b5dad6a4bb9a82d2.vercel-dns-016.com` **DNS only** (grey cloud)
   - Fallback: `cname.vercel-dns.com`

Preview while DNS propagates: https://dash-brandastic.vercel.app

## Roadmap vs AgencyAnalytics
- [x] Portfolio + client dashboards
- [x] Client-branded report pages
- [x] AI recommendations from metrics
- [ ] Live Meta/Google tokens + account map
- [ ] External client magic links (no full portfolio)
- [ ] Scheduled email/PDF report delivery
- [ ] Deeper creative / search-term insights when API fields available

## Policy
Meta remains **review only** for Chip/automation. Humans apply campaign changes in Ads Manager.
