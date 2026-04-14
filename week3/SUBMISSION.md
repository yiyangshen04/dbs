# Assignment 3 — Travel Bucket List

## Deliverables

- **Vercel URL**: https://dbs-murex.vercel.app
- **GitHub URL**: https://github.com/yiyangshen04/dbs/tree/main/week3

---

## Reflection Questions

### 1. Trace a request: a user searches, saves, and views it on their profile. What systems are involved?

**Search**: The user types "Japan" in the search bar on `/explore`. The React client component filters the country list that was fetched from our Next.js API route `GET /api/countries`. This route acts as a server-side proxy — it calls the **REST Countries API** (`restcountries.com/v3.1/all`), caches the response for 24 hours via Next.js `revalidate`, and returns the data to the browser. The search filtering itself happens client-side in the browser for instant feedback.

**Save**: When the user clicks "Save to Bucket List" on `/country/JPN`, the browser sends a `POST /api/saved` request. This Next.js API route first calls **Clerk** (`auth()`) to verify the user is logged in and extract their `userId`. It then uses the **Supabase** client (with the service role key) to insert a row into the `saved_countries` table with `user_id`, `country_code`, `country_name`, `flag_url`, and `region`.

**View**: When the user visits `/bucket-list`, the Clerk proxy middleware checks authentication. The page component sends `GET /api/saved`, which again uses Clerk's `auth()` for the `userId`, then queries Supabase: `SELECT * FROM saved_countries WHERE user_id = {userId}`. The results are rendered as a list with options to toggle visited status, edit notes, or remove.

**Systems involved**: Browser → Next.js Server (API Routes) → Clerk (authentication) → Supabase (database) → REST Countries API (external data).

### 2. Why should your app call the external API from the server (API route) instead of directly from the browser?

Three key reasons:

1. **Security**: If the API required an API key, calling from the browser would expose that key in the network tab. Server-side API routes keep secrets hidden. Even though REST Countries doesn't need a key, this pattern is essential for APIs that do.

2. **Control & Caching**: The server can cache responses using Next.js `revalidate`, reducing redundant API calls. Our `/api/countries` route caches the full country list for 24 hours — 100 users visiting the explore page only triggers one external API call, not 100.

3. **CORS & Reliability**: Some APIs block direct browser requests via CORS policies. A server-side proxy bypasses this entirely. The server can also handle errors gracefully, add rate limiting, and transform data before sending it to the client.

### 3. A classmate signs up on your app. What data does Clerk store vs. what does Supabase store? How are they connected?

**Clerk stores**:
- User identity: email address, password hash, profile photo
- Authentication state: sessions, JWTs, login timestamps
- OAuth connections (if using Google sign-in)
- A unique `userId` string (e.g., `user_2xK9mN...`)

**Supabase stores**:
- User-generated application data: saved countries, notes, visited status
- The `saved_countries` table with columns: `id`, `user_id`, `country_code`, `country_name`, `flag_url`, `region`, `notes`, `visited`, `created_at`

**How they're connected**: The `user_id` column in Supabase's `saved_countries` table stores the Clerk `userId` string. When a user makes an API request, the server calls `auth()` from `@clerk/nextjs/server` to get the authenticated `userId`, then uses it to filter Supabase queries (`WHERE user_id = ?`). Clerk handles "who is this person?" — Supabase handles "what has this person saved?"

### 4. Ask Claude (with MCP) to describe your database. Paste the response. Does it match your mental model?

**Claude's response via Supabase MCP** (`list_tables` with `verbose: true`):

```json
{
  "tables": [
    {
      "name": "public.saved_countries",
      "rls_enabled": true,
      "rows": 0,
      "columns": [
        { "name": "id", "data_type": "uuid", "default_value": "gen_random_uuid()" },
        { "name": "user_id", "data_type": "text" },
        { "name": "country_code", "data_type": "text" },
        { "name": "country_name", "data_type": "text" },
        { "name": "flag_url", "data_type": "text", "options": ["nullable"] },
        { "name": "region", "data_type": "text", "options": ["nullable"] },
        { "name": "notes", "data_type": "text", "options": ["nullable"] },
        { "name": "visited", "data_type": "boolean", "default_value": "false", "options": ["nullable"] },
        { "name": "created_at", "data_type": "timestamptz", "default_value": "now()", "options": ["nullable"] }
      ],
      "primary_keys": ["id"]
    }
  ]
}
```

**Does it match my mental model?** Yes, it matches exactly. The table has:
- A UUID primary key (`id`) auto-generated for each saved entry
- `user_id` (text) linking to Clerk's user identifier
- `country_code` + `country_name` identifying the country (with a UNIQUE constraint on `user_id, country_code` to prevent duplicates)
- `flag_url` and `region` for display purposes without re-fetching the API
- `notes` and `visited` for user personalization
- `created_at` for chronological ordering
- **RLS enabled** for defense-in-depth security (even though our API routes also filter by `user_id`)

The only thing not visible in the MCP response is the UNIQUE constraint on `(user_id, country_code)`, but I know it's there because I defined it in the migration.
