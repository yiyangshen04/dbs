# Travel Bucket List

A full-stack web app where users can explore countries worldwide, save them to a personal travel bucket list, add notes, and mark countries as visited.

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Clerk for authentication
- Supabase for database
- REST Countries API for country data

## Design
- Style inspired by European neoclassical elegance (from v25 of Assignment 1)
- Fonts: Cormorant Garamond (headings) + Lora (body)
- Color palette: Gold (#c9a84c), Cream (#f5f0e8), Warm White (#faf8f3), Brown (#5c4a32)
- Region accent colors: Europe (#6a8caa), Asia (#c9a84c), Africa (#d4845a), Americas (#2d5a3d), Oceania (#6aadcc)

## Routes
| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page with hero and region overview |
| `/explore` | Public | Browse/search all countries with region filter |
| `/country/[code]` | Public | Country detail page |
| `/bucket-list` | Auth required | User's saved countries |
| `/sign-in` | Public | Clerk sign-in |
| `/sign-up` | Public | Clerk sign-up |

## API Routes
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/countries` | GET | Proxy to REST Countries API |
| `/api/saved` | GET | Get user's saved countries |
| `/api/saved` | POST | Save a country |
| `/api/saved` | DELETE | Remove a saved country |
| `/api/saved` | PATCH | Update notes/visited status |

## Data Model
```typescript
interface SavedCountry {
  id: string;
  user_id: string;
  country_code: string;  // ISO 3166-1 alpha-3
  country_name: string;
  flag_url: string;
  region: string;
  notes: string | null;
  visited: boolean;
  created_at: string;
}
```

## Key Files
- `src/app/globals.css` — Design system (v25 tokens + Tailwind v4)
- `src/app/layout.tsx` — Root layout (ClerkProvider + fonts)
- `src/proxy.ts` — Clerk auth proxy (Next.js 16 convention)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/countries.ts` — REST Countries API helpers
- `src/lib/types.ts` — Shared TypeScript types

## Clerk Authentication
- Uses Keyless mode for development (auto-generates temporary keys)
- After claiming your app at Clerk dashboard, add real keys to .env.local
- Uses `<Show>` component for conditional rendering (signed-in/signed-out)
- `src/proxy.ts` protects `/bucket-list` route

## Environment Variables (.env.local)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (optional in dev — Keyless mode)
- `CLERK_SECRET_KEY` (optional in dev — Keyless mode)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
