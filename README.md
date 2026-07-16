# dash.brandastic.com

Brandastic Ads Dashboard for **team + client review** of Meta + Google Ads.

## What it is
- Look/feel inspired by [brandastic.co](https://brandastic.co/) (sidebar shell, Inter, blue/cyan/purple accents, card metrics)
- Multi-client portfolio overview
- Client detail pages with Meta vs Google split
- Campaign table
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
1. Create GitHub repo (Justin)
2. Push this folder to `main`
3. Import project in Vercel under `nase007s-projects`
4. Set env vars
5. Add domain `dash.brandastic.com`
   - Cloudflare DNS: `dash` CNAME → `cname.vercel-dns.com` **DNS only** (grey cloud), same rule as course

Or from CLI:
```bash
npx vercel@latest --prod --token $VERCEL_TOKEN
```

## Policy
Meta remains **review only** for Chip/automation. Humans apply campaign changes in Ads Manager.
