# VietFi Advisor × Appwrite Cloud — Clone Design

**Date:** 2026-04-02
**Status:** Approved
**Author:** Claude Code

---

## 1. Overview

Tạo bản clone của VietFi Advisor sử dụng **Appwrite Cloud** thay vì Supabase. Đây là project hoàn toàn mới, repo riêng (`vietfi-appwrite`). Frontend Next.js deploy trên **Appwrite Sites**, data layer trên **Appwrite Database**, AI chat trên **Appwrite Functions**. Railway (đã deploy) tiếp tục giữ crawlers và market data.

---

## 2. Architecture

```
GitHub (vietfi-appwrite repo)
│
├── Appwrite Cloud
│   ├── Auth (Email/Password + Google OAuth)
│   ├── Database:
│   │   ├── profiles
│   │   ├── budget_pots
│   │   ├── expenses
│   │   ├── debts
│   │   └── gamification
│   └── Functions:
│       └── chat-vetvang (Gemini AI chat)
│
└── Railway (existing — kept as-is)
    ├── Market data crawlers (VN-Index, Gold, USD/VND)
    ├── News crawler (CafeF RSS)
    └── Cron jobs
```

**Data flow:**
```
User → Appwrite Sites (Next.js)
       ├── Auth   → Appwrite Auth
       ├── CRUD   → Appwrite Database
       ├── AI Chat → Appwrite Function → Gemini API
       └── Market/News → Railway API (existing endpoint)
```

---

## 3. Appwrite Database Schema

### Collection: `profiles`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | string | PK (auto) | User ID, matches Appwrite `users.$id` |
| income | float | no | Monthly income (VND) |
| has_debt | boolean | no | |
| risk_profile | string | no | conservative/balanced/aggressive |
| setup_at | datetime | no | ISO date when onboarding completed |

### Collection: `budget_pots`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | string | PK (auto) | |
| user_id | string | yes | Matches Appwrite `users.$id` |
| name | string | yes | |
| icon_key | string | no | Default: "Wallet" |
| allocated | float | yes | Amount allocated (VND) |
| color | string | no | Hex color |
| sort_order | integer | no | |

### Collection: `expenses`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | string | PK (auto) | |
| user_id | string | yes | |
| pot_id | string | no | Links to budget_pots.$id |
| amount | float | yes | VND |
| note | string | no | |
| category | string | no | |
| created_at | datetime | no | |

### Collection: `debts`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | string | PK (auto) | |
| user_id | string | yes | |
| name | string | yes | |
| type | string | yes | credit_card, mortgage, personal, etc. |
| principal | float | yes | Original amount (VND) |
| rate | float | yes | Interest rate (%/year) |
| min_payment | float | yes | Minimum monthly payment |
| icon | string | no | |
| color | string | no | |

### Collection: `gamification`
| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | string | PK (auto) | User ID |
| xp | integer | no | Default: 0 |
| level | integer | no | Default: 0 |
| level_name | string | no | e.g. "🐣 Vẹt Teen" |
| streak | integer | no | Default: 0 |
| last_active_date | string | no | ISO date |
| actions | array | no | List of action strings |
| quest_completed | boolean | no | |
| lessons_done | array | no | |
| streak_freeze | object | no | JSON object |

### Permissions Strategy
All user-specific collections:
- `read("users")` — authenticated users
- `write("users")` — authenticated users
- **Document-level filter:** `user_id = "{{ viewer.$id }}"`

This replaces Supabase RLS. Appwrite uses attribute-level read/write permissions.

---

## 4. SDK Migration Map

| Supabase | → Appwrite |
|---|---|
| `@supabase/ssr` | `appwrite` SDK |
| `createBrowserClient()` | `new Client()` + `setEndpoint()` + `setProject()` |
| `createServerClient()` | `new Client()` + Server SDK (`@appwrite/server`) |
| `supabase.auth.getUser()` | `account.get()` |
| `supabase.auth.signInWithPassword()` | `account.createEmailPasswordSession()` |
| `supabase.auth.signInWithOAuth({ provider: "google" })` | `account.createOAuth2Token({ provider: OAuthProvider.Google })` |
| `supabase.auth.signUp()` | `account.create(ID.unique(), email, password)` |
| `supabase.auth.signOut()` | `account.deleteSession("current")` |
| `supabase.from("t").select(...)` | `databases.listDocuments(dbId, "t", queries)` |
| `supabase.from("t").insert(...)` | `databases.createDocument(dbId, "t", ID.unique(), data)` |
| `supabase.from("t").upsert(...)` | `databases.updateDocument()` or `createDocument()` |
| `supabase.from("t").delete().eq(...)` | `databases.deleteDocument(dbId, "t", docId)` |

---

## 5. Appwrite Functions

### `chat-vetvang`
- **Runtime:** Node.js 22
- **Trigger:** HTTP (async disabled — streaming Gemini response)
- **Timeout:** 60s
- **Variables (env):** `GEMINI_API_KEY`, `GEMINI_BASE_URL`
- **Entrypoint:** `src/functions/chat-vetvang/index.ts`
- **Behavior:** Proxy to Gemini streaming API. Input: `{ message: string, history: Message[] }`. Output: SSE stream.

No cron functions on Appwrite — Railway handles all scheduled crawlers.

---

## 6. GitHub CI/CD

### Frontend → Appwrite Sites
Connect GitHub repo → Appwrite Sites → auto-deploy on push to `main`.
- Build: `npm run build`
- Output: `./.next`

### Functions → Appwrite Functions
GitHub Actions + `appwrite/setup-for-appwrite@v2`:
```yaml
- uses: appwrite/setup-for-appwrite@v2
  with:
    method: key
    key: ${{ secrets.APPWRITE_API_KEY }}
    project: ${{ secrets.APPWRITE_PROJECT_ID }}
- run: appwrite push functions --force
```

---

## 7. Environment Variables

```env
# Appwrite (public — safe for client)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<project_id>

# Railway (existing — public endpoint)
NEXT_PUBLIC_RAILWAY_URL=https://your-railway-app.railway.app

# Secrets (server-only / Appwrite Function env)
GEMINI_API_KEY=<key>
```

---

## 8. File Structure (Repo)

```
vietfi-appwrite/
├── frontend/                    # Next.js app (Appwrite Sites)
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── api/           # API routes (market data proxy → Railway)
│   │   ├── components/
│   │   └── lib/
│   │       ├── appwrite/      # SDK wrappers
│   │       │   ├── client.ts
│   │       │   ├── account.ts
│   │       │   └── database.ts
│   │       ├── appwrite-user-data.ts  # DAL
│   │       └── appwrite-useUserData.ts # React hooks
│   ├── appwrite.config.json
│   ├── package.json
│   └── .env.example
│
├── functions/                  # Appwrite Functions source
│   └── chat-vetvang/
│       ├── index.ts
│       └── package.json
│
├── scripts/
│   └── setup-appwrite-db.ts   # Appwrite CLI setup script
│
└── docs/
    └── appwrite-schema.md      # Collection definitions (for manual setup)
```

---

## 9. Migration Phases

| Phase | Task | Owner | Effort |
|---|---|---|---|
| 1 | Tạo repo `vietfi-appwrite`, init Next.js, install `appwrite` SDK | Human | 30 min |
| 2 | Tạo Appwrite project (cloud.appwrite.io), lấy Project ID + Endpoint | Human | 10 min |
| 3 | Tạo 5 collections trên Appwrite Console (profiles, budget_pots, expenses, debts, gamification) | Human + CLI | 30 min |
| 4 | Viết `src/lib/appwrite/client.ts` (Browser + Server clients) | Claude | 30 min |
| 5 | Viết `src/lib/appwrite/account.ts` (Auth helpers) | Claude | 30 min |
| 6 | Viết `src/lib/appwrite/database.ts` (CRUD helpers) | Claude | 30 min |
| 7 | Viết `src/lib/appwrite-user-data.ts` (DAL — map from user-data.ts) | Claude | 1 hr |
| 8 | Viết `src/lib/appwrite-useUserData.ts` (React hooks) | Claude | 1 hr |
| 9 | Migrate login page → Appwrite Auth (email/password + Google OAuth) | Claude | 1 hr |
| 10 | Migrate auth actions (login, signup, logout, OAuth) → Server Actions | Claude | 1 hr |
| 11 | Deploy `chat-vetvang` function lên Appwrite (connect GitHub) | Human | 30 min |
| 12 | Update API routes → proxy to Railway for market/news | Claude | 1 hr |
| 13 | Connect Appwrite Sites → GitHub repo, config env vars | Human | 20 min |
| 14 | Full smoke test | Both | 1 hr |

---

## 10. Key Differences from Supabase Version

| Aspect | Supabase | Appwrite |
|---|---|---|
| Auth session | Cookie via `@supabase/ssr` | `account.get()` on client, cookies manual |
| RLS | Row Level Security policies | Attribute permissions + document-level filter |
| Database ID | Single default | Explicit `databaseId` per query |
| User ID | `auth.uid()` | `$currentAccount.id` or `account.get().$id` |
| Realtime | Built-in subscriptions | Appwrite Realtime (separate) |
| Storage | `supabase.storage` | Appwrite Storage (not used in VietFi) |
| Migration flag | `vietfi_migrated` localStorage | Appwrite user exists = migrated |

---

## 11. Dependencies

```json
{
  "dependencies": {
    "appwrite": "^16.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@google/generative-ai": "^0.21.0",
    "framer-motion": "^11.0.0",
    "tailwindcss": "^4.0.0",
    "axios": "^1.7.0",
    "cheerio": "^1.0.0"
  }
}
```

Remove:
- `@supabase/supabase-js`
- `@supabase/ssr`

---

## 12. Success Criteria

- [ ] User can sign up / login with email+password
- [ ] User can login with Google OAuth
- [ ] Budget pots CRUD works (create, read, update, delete)
- [ ] Expenses CRUD works
- [ ] Debts CRUD works
- [ ] Gamification state persists across sessions
- [ ] AI chat (`chat-vetvang`) returns streaming response
- [ ] Market data loads from Railway API
- [ ] Appwrite Sites deploys on push to `main`
- [ ] No Supabase SDK in codebase
