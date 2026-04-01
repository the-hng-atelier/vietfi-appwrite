# CLAUDE.md — VietFi Advisor × Appwrite Cloud

## Project Overview

Clone của VietFi Advisor dùng Appwrite Cloud thay Supabase.

## Tech Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Backend:** Appwrite Cloud (Auth + Database + Functions)
- **Data:** Railway (Market data crawlers — kept from original project)
- **Deployment:** Appwrite Sites + GitHub Actions

## Key Architecture

```
Appwrite Cloud:
  ├── Auth (Email/Password + Google OAuth)
  ├── Database: profiles, budget_pots, expenses, debts, gamification
  └── Functions: chat-vetvang (Gemini AI)

Railway (existing):
  └── Market data + News crawlers
```

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Environment Variables

Xem `.env.example` — cần:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APPWRITE_FUNCTION_ID`
- `NEXT_PUBLIC_RAILWAY_URL`
- `GEMINI_API_KEY` (secret)

## Appwrite Collections

Database: `vietfi_db`

| Collection | Key Field | Purpose |
|---|---|---|
| `profiles` | user_id | Income, risk profile, onboarding |
| `budget_pots` | user_id | 6 spending pots |
| `expenses` | user_id | Transactions |
| `debts` | user_id | Debt items |
| `gamification` | user_id | XP, streak, badges |

## SDK Pattern

```typescript
// Browser client
import { getAccount, getDatabases } from "@/lib/appwrite/client";

// Auth
import { signIn, signUp, getCurrentUser, getGoogleOAuthUrl } from "@/lib/appwrite/account";

// DAL
import { getBudget, setBudget, getExpenses } from "@/lib/appwrite-user-data";

// React hooks
import { useUserBudget, useUserDebts, useUserGamification } from "@/lib/appwrite-useUserData";
```

## Critical Patterns

- **OAuth:** `getGoogleOAuthUrl()` phải gọi **client-side** — `window.location.href = url`
- **Query.equal:** Values luôn là array — `Query.equal("user_id", [userId])`
- **Gamification:** `streak_freeze` stored as JSON string (Appwrite không có object type)
- **Guest mode:** localStorage fallback được giữ nguyên trong getBudget/setBudget
- **Middleware:** Server-side session check dùng `Client.setSession(cookieValue)`
