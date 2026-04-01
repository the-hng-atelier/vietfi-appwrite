# VietFi Advisor × Appwrite Clone — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clone VietFi Advisor với Appwrite Cloud thay Supabase. Repo mới `vietfi-appwrite`, dual backend (Appwrite + Railway).

**Architecture:**
- Appwrite Cloud: Auth + Database + Functions (chat-vetvang)
- Railway (existing): Market data crawlers + cron jobs
- Appwrite Sites: Next.js frontend (deploy từ GitHub)

**Tech Stack:** Next.js 15, React 19, TypeScript, Appwrite SDK v16, Tailwind CSS v4

---

## Chunk 1: Project Setup — Repo + SDK + Appwrite Console

### Task 1: Tạo repo GitHub mới

**Files:**
- Create: `frontend/` (Next.js app directory)
- Create: `functions/` (Appwrite Functions source)

- [ ] **Step 1: Tạo GitHub repo `vietfi-appwrite`**

```bash
# Tạo repo trên GitHub (thủ công hoặc gh cli)
gh repo create vietfi-appwrite --public --clone

cd vietfi-appwrite
mkdir frontend functions docs
touch frontend/.gitkeep functions/.gitkeep
git add .
git commit -m "chore: init vietfi-appwrite repo structure"
git push -u origin main
```

- [ ] **Step 2: Init Next.js app trong `frontend/`**

```bash
cd frontend
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git \
  --use-npm

cd ..
```

Expected: Next.js 15 app in `frontend/` with TypeScript, Tailwind, App Router.

- [ ] **Step 3: Cài Appwrite SDK**

```bash
cd frontend
npm install appwrite

# Commit
git add . && git commit -m "chore: init Next.js + install appwrite SDK"
```

- [ ] **Step 4: Remove Supabase packages**

```bash
npm uninstall @supabase/supabase-js @supabase/ssr
npm install  # clean install

git add . && git commit -m "chore: remove Supabase, add Appwrite SDK"
```

---

### Task 2: Setup Appwrite Cloud Project

**Files:**
- Modify: `frontend/.env.example`
- Create: `docs/appwrite-schema.md`

- [ ] **Step 1: Tạo Appwrite project trên cloud.appwrite.io**

1. Go to https://cloud.appwrite.io
2. Click **Create Project**
3. Name: `vietfi-appwrite`
4. Platform: **Web**
5. Hostname: `<your-site-domain>` (điền sau khi deploy Appwrite Sites)
6. Lấy **Project ID**

- [ ] **Step 2: Setup .env.example**

```bash
cat > frontend/.env.example << 'EOF'
# Appwrite (public — safe for client)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your_project_id>

# Railway (existing — public endpoint)
NEXT_PUBLIC_RAILWAY_URL=<your_railway_url>

# Secrets
GEMINI_API_KEY=<your_gemini_key>
EOF
```

- [ ] **Step 3: Tạo `docs/appwrite-schema.md`**

```bash
cat > docs/appwrite-schema.md << 'EOF'
# Appwrite Database Schema — VietFi Advisor

## Database ID
`vietfi_db`

## Collections

### profiles
- Collection ID: `profiles`
- Attributes:
  - `user_id` (string, required, size=64)   ← ADD THIS (not $id — for consistent filtering)
  - `income` (float, optional)
  - `has_debt` (boolean, optional)
  - `risk_profile` (string, optional, size=32)
  - `setup_at` (datetime, optional)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)

### budget_pots
- Collection ID: `budget_pots`
- Attributes:
  - `user_id` (string, required, size=64)
  - `name` (string, required, size=64)
  - `icon_key` (string, optional, size=32)
  - `allocated` (float, required)
  - `color` (string, optional, size=16)
  - `sort_order` (integer, optional)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)

### expenses
- Collection ID: `expenses`
- Attributes:
  - `user_id` (string, required, size=64)
  - `pot_id` (string, optional, size=64)
  - `amount` (float, required)
  - `note` (string, optional, size=256)
  - `category` (string, optional, size=64)
  - `created_at` (datetime, optional)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)
- Index: `index_created` on `created_at` (key type, DESC)

### debts
- Collection ID: `debts`
- Attributes:
  - `user_id` (string, required, size=64)
  - `name` (string, required, size=64)
  - `type` (string, required, size=32)
  - `principal` (float, required)
  - `rate` (float, required)
  - `min_payment` (float, required)
  - `icon` (string, optional, size=32)
  - `color` (string, optional, size=16)
- Permissions: read(`users`), write(`users`)
- Index: `index_user` on `user_id` (key type)

### gamification
- Collection ID: `gamification`
- Attributes:
  - `xp` (integer, optional, default=0)
  - `level` (integer, optional, default=0)
  - `level_name` (string, optional, size=32)
  - `streak` (integer, optional, default=0)
  - `last_active_date` (string, optional, size=32)
  - `actions` (array, optional)
  - `quest_completed` (boolean, optional)
  - `lessons_done` (array, optional)
  - `streak_freeze` (string, optional, size=512) -- JSON stored as string
- Permissions: read(`users`), write(`users`)
EOF
```

- [ ] **Step 4: Commit**

```bash
git add docs/appwrite-schema.md frontend/.env.example
git commit -m "chore: add appwrite schema docs and env template"
```

---

## Chunk 2: Appwrite SDK Layer — Client + Account + Database Helpers

### Task 3: Viết `src/lib/appwrite/client.ts`

**Files:**
- Create: `frontend/src/lib/appwrite/client.ts`

- [ ] **Step 1: Tạo Appwrite browser client**

```bash
mkdir -p frontend/src/lib/appwrite
```

```typescript
// frontend/src/lib/appwrite/client.ts
import { Client, Account, Databases, OAuthProvider } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

// Singleton browser client
let _client: Client | null = null;

export function getAppwriteClient(): Client {
  if (_client) return _client;
  _client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);
  return _client;
}

export function getAccount(): Account {
  return new Account(getAppwriteClient());
}

export function getDatabases(): Databases {
  return new Databases(getAppwriteClient());
}

export const APPWRITE_DATABASE_ID = "vietfi_db";
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/appwrite/client.ts
git commit -m "feat(appwrite): add browser SDK client"
```

---

### Task 4: Viết `src/lib/appwrite/account.ts`

**Files:**
- Create: `frontend/src/lib/appwrite/account.ts`

> ⚠️ **IMPORTANT — OAuth flow:** `createOAuth2Token()` in the browser SDK auto-redirects to the OAuth provider. It must be called **client-side** (not from a Server Action), because `window.location.href` only works in the browser. The `getGoogleOAuthUrl()` function below is for middleware/redirect use.

- [ ] **Step 1: Viết auth helpers**

```typescript
// frontend/src/lib/appwrite/account.ts
import { ID, OAuthProvider } from "appwrite";
import { getAccount } from "./client";

export interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Get current authenticated user. Returns null if not logged in. */
export async function getCurrentUser(): Promise<AppwriteUser | null> {
  try {
    const account = getAccount();
    const user = await account.get();
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

/** Sign up with email + password */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<void> {
  const account = getAccount();
  await account.create(ID.unique(), email, password, name);
  // Auto-login after signup
  await signIn(email, password);
}

/** Sign in with email + password */
export async function signIn(
  email: string,
  password: string
): Promise<void> {
  const account = getAccount();
  await account.createEmailPasswordSession(email, password);
}

/** Sign out current session */
export async function signOut(): Promise<void> {
  const account = getAccount();
  await account.deleteSession("current");
}

/** Get Google OAuth URL (returns URL string — call window.location.href client-side) */
export async function getGoogleOAuthUrl(): Promise<string> {
  const account = getAccount();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${origin}/auth/callback`,
    failure: `${origin}/login?error=oauth_failed`,
  });
}

/** Delete account */
export async function deleteAccount(): Promise<void> {
  const account = getAccount();
  await account.delete();
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/appwrite/account.ts
git commit -m "feat(appwrite): add auth account helpers"
```

---

### Task 5: Viết `src/lib/appwrite/database.ts`

**Files:**
- Create: `frontend/src/lib/appwrite/database.ts`

- [ ] **Step 1: Viết database helpers**

```typescript
// frontend/src/lib/appwrite/database.ts
import { ID, Query } from "appwrite";
import { getDatabases, APPWRITE_DATABASE_ID } from "./client";

// ── Generic helpers ────────────────────────────────────────────────────────

/** Create a document. Auto-assigns user_id from current session. */
export async function createDocument<T extends Record<string, unknown>>(
  collectionId: string,
  data: T,
  userId: string
): Promise<string> {
  const db = getDatabases();
  const doc = await db.createDocument(
    APPWRITE_DATABASE_ID,
    collectionId,
    ID.unique(),
    { ...data, user_id: userId }
  );
  return doc.$id;
}

/** List documents for current user */
export async function listUserDocuments<T>(
  collectionId: string,
  userId: string,
  orderByField = "created_at",
  limit = 500
): Promise<T[]> {
  const db = getDatabases();
  const result = await db.listDocuments(
    APPWRITE_DATABASE_ID,
    collectionId,
    [
      Query.equal("user_id", [userId]),
      Query.orderDesc(orderByField),
      Query.limit(limit),
    ]
  );
  return result.documents as unknown as T[];
}

/** Update a document */
export async function updateDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDatabases();
  await db.updateDocument(
    APPWRITE_DATABASE_ID,
    collectionId,
    documentId,
    data
  );
}

/** Delete a document */
export async function deleteDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  const db = getDatabases();
  await db.deleteDocument(APPWRITE_DATABASE_ID, collectionId, documentId);
}

/** Delete all documents for user (used before re-insert) */
export async function deleteAllUserDocuments(
  collectionId: string,
  userId: string
): Promise<void> {
  const db = getDatabases();
  const result = await db.listDocuments(
    APPWRITE_DATABASE_ID,
    collectionId,
    [Query.equal("user_id", [userId]), Query.limit(200)]
  );
  await Promise.all(
    result.documents.map((doc) =>
      db.deleteDocument(APPWRITE_DATABASE_ID, collectionId, doc.$id)
    )
  );
}

/** Upsert a document by user_id (single-doc-per-user pattern) */
export async function upsertUserDocument(
  collectionId: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDatabases();
  // Try to find existing doc
  try {
    const result = await db.listDocuments(
      APPWRITE_DATABASE_ID,
      collectionId,
      [Query.equal("user_id", [userId]), Query.limit(1)]
    );
    if (result.documents.length > 0) {
      await db.updateDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        result.documents[0].$id,
        data
      );
    } else {
      await db.createDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        ID.unique(),
        { ...data, user_id: userId }
      );
    }
  } catch {
    // Fallback: create new
    await db.createDocument(
      APPWRITE_DATABASE_ID,
      collectionId,
      ID.unique(),
      { ...data, user_id: userId }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/appwrite/database.ts
git commit -m "feat(appwrite): add database helper functions"
```

---

## Chunk 3: Data Access Layer — Appwrite-User-Data

### Task 6: Viết `src/lib/appwrite-user-data.ts` (DAL)

**Files:**
- Create: `frontend/src/lib/appwrite-user-data.ts`

Map từ `src/lib/supabase/user-data.ts` sang Appwrite.

- [ ] **Step 1: Viết DAL — profile, income, budget pots**

```typescript
// frontend/src/lib/appwrite-user-data.ts
import {
  createDocument,
  listUserDocuments,
  updateDocument,
  deleteAllUserDocuments,
  upsertUserDocument,
} from "./appwrite/database";
import { getCurrentUser } from "./appwrite/account";

// ── Collection IDs ─────────────────────────────────────────────────────────
const COL_PROFILES = "profiles";
const COL_BUDGET_POTS = "budget_pots";
const COL_EXPENSES = "expenses";
const COL_DEBTS = "debts";
const COL_GAMIFICATION = "gamification";

// ── Types (mirrored from supabase/user-data.ts) ────────────────────────────

export interface BudgetPot {
  id: string;
  name: string;
  iconKey: string;
  allocated: number;
  color: string;
  sort_order?: number;
}

export interface Expense {
  id: string;
  pot_id?: string | null;
  amount: number;
  note?: string;
  category?: string;
  created_at?: string;
  date: string;
}

export interface BudgetData {
  pots: BudgetPot[];
  expenses: Expense[];
}

export interface DebtItem {
  name: string;
  type: string;
  principal: number;
  rate: number;
  min_payment: number;
  icon: string;
  color: string;
}

export interface GamificationState {
  xp: number;
  level: number;
  levelName: string;
  streak: number;
  lastActiveDate: string;
  actions: string[];
  questCompleted: boolean;
  streakFreeze?: Record<string, unknown>; // serialized as JSON string in Appwrite
}

export interface OnboardingData {
  completed: boolean;
  income: number;
  hasDebt: boolean;
  riskProfile: string;
  setupAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.$id ?? null;
}

// ── Profile ───────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<OnboardingData> {
  const DEFAULT: OnboardingData = {
    completed: false,
    income: 0,
    hasDebt: false,
    riskProfile: "",
    setupAt: "",
  };

  const userId = await requireUserId();
  if (!userId) return DEFAULT;

  try {
    const docs = await listUserDocuments<{
      income: number;
      has_debt: boolean;
      risk_profile: string;
      setup_at: string;
    }>(COL_PROFILES, userId);

    if (docs.length === 0) return DEFAULT;

    const p = docs[0];
    return {
      completed: !!p.setup_at,
      income: p.income ?? 0,
      hasDebt: p.has_debt ?? false,
      riskProfile: p.risk_profile ?? "",
      setupAt: p.setup_at ?? "",
    };
  } catch {
    return DEFAULT;
  }
}

export async function saveUserProfile(
  profile: Partial<OnboardingData>
): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await upsertUserDocument(COL_PROFILES, userId, {
    income: profile.income ?? 0,
    has_debt: profile.hasDebt ?? false,
    risk_profile: profile.riskProfile ?? "",
    setup_at: profile.setupAt || new Date().toISOString(),
  });
}

// ── Budget Pots ───────────────────────────────────────────────────────────

export async function getBudgetPots(): Promise<BudgetPot[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  try {
    const docs = await listUserDocuments<{
      $id: string;
      name: string;
      icon_key: string;
      allocated: number;
      color: string;
      sort_order: number;
    }>(COL_BUDGET_POTS, userId, "sort_order");

    return docs.map((d) => ({
      id: d.$id,
      name: d.name,
      iconKey: d.icon_key ?? "Wallet",
      allocated: d.allocated ?? 0,
      color: d.color ?? "#E6B84F",
      sort_order: d.sort_order ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function saveBudgetPots(pots: BudgetPot[]): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await deleteAllUserDocuments(COL_BUDGET_POTS, userId);

  if (pots.length === 0) return;

  // Insert new pots
  await Promise.all(
    pots.map((pot, i) =>
      createDocument(
        COL_BUDGET_POTS,
        {
          name: pot.name,
          icon_key: pot.iconKey,
          allocated: pot.allocated,
          color: pot.color,
          sort_order: i,
        },
        userId
      )
    )
  );
}

// ── Expenses ──────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  try {
    const docs = await listUserDocuments<{
      $id: string;
      pot_id?: string;
      amount: number;
      note?: string;
      category?: string;
      created_at?: string;
    }>(COL_EXPENSES, userId, "created_at");

    return docs.map((d) => ({
      id: d.$id,
      pot_id: d.pot_id,
      amount: d.amount,
      note: d.note ?? "",
      category: d.category ?? "",
      created_at: d.created_at,
      date: d.created_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function addExpense(
  expense: Omit<Expense, "id">
): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await createDocument(
    COL_EXPENSES,
    {
      pot_id: expense.pot_id ?? null,
      amount: expense.amount,
      note: expense.note ?? "",
      category: expense.category ?? "",
      created_at: expense.created_at ?? expense.date ?? new Date().toISOString(),
    },
    userId
  );
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await deleteAllUserDocuments(COL_EXPENSES, userId);

  if (expenses.length === 0) return;

  await Promise.all(
    expenses.map((e) =>
      createDocument(
        COL_EXPENSES,
        {
          pot_id: e.pot_id ?? null,
          amount: e.amount,
          note: e.note ?? "",
          category: e.category ?? "",
          created_at: e.created_at ?? e.date ?? new Date().toISOString(),
        },
        userId
      )
    )
  );
}

// ── Debts ─────────────────────────────────────────────────────────────────

export async function getDebts(): Promise<DebtItem[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  try {
    const docs = await listUserDocuments<DebtItem & { $id: string }>(
      COL_DEBTS,
      userId
    );

    return docs.map((d) => ({
      name: d.name,
      type: d.type,
      principal: d.principal,
      rate: d.rate,
      min_payment: d.min_payment,
      icon: d.icon ?? "CreditCard",
      color: d.color ?? "#E6B84F",
    }));
  } catch {
    return [];
  }
}

export async function saveDebts(debts: DebtItem[]): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await deleteAllUserDocuments(COL_DEBTS, userId);

  if (debts.length === 0) return;

  await Promise.all(
    debts.map((d) =>
      createDocument(
        COL_DEBTS,
        {
          name: d.name,
          type: d.type,
          principal: d.principal,
          rate: d.rate,
          min_payment: d.min_payment,
          icon: d.icon,
          color: d.color,
        },
        userId
      )
    )
  );
}

// ── Gamification ───────────────────────────────────────────────────────────

export async function getGamificationState(): Promise<GamificationState | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  try {
    const docs = await listUserDocuments<{
      xp: number;
      level: number;
      level_name: string;
      streak: number;
      last_active_date: string;
      actions: string[];
      quest_completed: boolean;
    }>(COL_GAMIFICATION, userId, "xp");

    if (docs.length === 0) return null;

    const g = docs[0];
    return {
      xp: g.xp ?? 0,
      level: g.level ?? 0,
      levelName: g.level_name ?? "🐣 Vẹt Teen",
      streak: g.streak ?? 0,
      lastActiveDate: g.last_active_date ?? "",
      actions: g.actions ?? [],
      questCompleted: g.quest_completed ?? false,
    };
  } catch {
    return null;
  }
}

export async function saveGamificationState(
  state: GamificationState
): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;

  await upsertUserDocument(COL_GAMIFICATION, userId, {
    xp: state.xp,
    level: state.level,
    level_name: state.levelName,
    streak: state.streak,
    last_active_date: state.lastActiveDate,
    actions: state.actions,
    quest_completed: state.questCompleted,
    // Appwrite has no object type — serialize streak_freeze as JSON string
    streak_freeze: JSON.stringify(state.streakFreeze ?? {}),
  });
}

// ── Income ────────────────────────────────────────────────────────────────

export async function getIncome(): Promise<number> {
  const profile = await getUserProfile();
  return profile.income;
}

export async function saveIncome(income: number): Promise<void> {
  await saveUserProfile({ income });
}

// ── Budget (bundled) ───────────────────────────────────────────────────────
// Guest fallback: unauthenticated users keep using localStorage

export async function getBudget(): Promise<BudgetData> {
  const userId = await requireUserId();
  if (!userId) {
    // Guest: use localStorage (server-safe via typeof check)
    if (typeof window === "undefined") return { pots: [], expenses: [] };
    const { getBudgetPots: localGet, getExpenses: localGetExp } = await import("./storage");
    return { pots: localGet(), expenses: localGetExp() };
  }
  const [pots, expenses] = await Promise.all([getBudgetPots(), getExpenses()]);
  return { pots, expenses };
}

export async function setBudget(budget: BudgetData): Promise<void> {
  const userId = await requireUserId();
  if (!userId) {
    if (typeof window === "undefined") return;
    const { setBudgetPots: localSetPots, setExpenses: localSetExp } = await import("./storage");
    localSetPots(budget.pots);
    localSetExp(budget.expenses);
    return;
  }
  await Promise.all([
    saveBudgetPots(budget.pots),
    saveExpenses(budget.expenses),
  ]);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/appwrite-user-data.ts
git commit -m "feat(appwrite): add data access layer (DAL)"
```

---

## Chunk 4: React Hooks — Appwrite Version

### Task 7: Viết `src/lib/appwrite-useUserData.ts`

**Files:**
- Create: `frontend/src/lib/appwrite-useUserData.ts`

- [ ] **Step 1: Viết React hooks**

```typescript
// frontend/src/lib/appwrite-useUserData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  BudgetData,
  DebtItem,
} from "./appwrite-user-data";
import type { GamificationState } from "./gamification";

/* ─── Budget ──────────────────────────────────────────────────── */

export function useUserBudget(initialData?: BudgetData | null) {
  const [data, setData] = useState<BudgetData | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (data !== null) return;
    setLoading(true);
    import("./appwrite-user-data")
      .then(({ getBudget }) =>
        getBudget()
          .then((d) => { setData(d); setLoading(false); })
          .catch((e) => {
            setError(e instanceof Error ? e : new Error(String(e)));
            setLoading(false);
          })
      );
  }, [data]);

  const save = useCallback(async (newData: BudgetData) => {
    setLoading(true);
    setError(null);
    try {
      const { setBudget } = await import("./appwrite-user-data");
      await setBudget(newData);
      setData(newData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, save };
}

/* ─── Debts ────────────────────────────────────────────────────── */

export function useUserDebts(initialData?: DebtItem[] | null) {
  const [data, setData] = useState<DebtItem[] | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (data !== null) return;
    setLoading(true);
    import("./appwrite-user-data")
      .then(({ getDebts }) =>
        getDebts()
          .then((d) => { setData(d); setLoading(false); })
          .catch((e) => {
            setError(e instanceof Error ? e : new Error(String(e)));
            setLoading(false);
          })
      );
  }, [data]);

  const save = useCallback(async (newData: DebtItem[]) => {
    setLoading(true);
    setError(null);
    try {
      const { saveDebts } = await import("./appwrite-user-data");
      await saveDebts(newData);
      setData(newData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, save };
}

/* ─── Gamification ─────────────────────────────────────────────── */

export function useUserGamification(initialData?: GamificationState | null) {
  const [data, setData] = useState<GamificationState | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (data !== null) return;
    setLoading(true);
    import("./appwrite-user-data")
      .then(({ getGamificationState }) =>
        getGamificationState()
          .then((d) => { setData(d); setLoading(false); })
          .catch((e) => {
            setError(e instanceof Error ? e : new Error(String(e)));
            setLoading(false);
          })
      );
  }, [data]);

  const save = useCallback(async (newData: GamificationState) => {
    setLoading(true);
    setError(null);
    try {
      const { saveGamificationState } = await import("./appwrite-user-data");
      await saveGamificationState(newData);
      setData(newData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, save };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/appwrite-useUserData.ts
git commit -m "feat(appwrite): add React hooks for user data"
```

---

## Chunk 5: Auth Pages — Login + OAuth + Signout

### Task 8: Viết Auth Pages

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/login/actions.ts` (Server Actions)
- Create: `frontend/src/app/auth/callback/page.tsx` (OAuth callback)
- Create: `frontend/src/app/auth/signout/route.ts`

- [ ] **Step 1: Tạo Server Actions cho auth**

```bash
mkdir -p frontend/src/app/login
mkdir -p frontend/src/app/auth/callback
mkdir -p frontend/src/app/auth/signout
```

```typescript
// frontend/src/app/login/actions.ts
"use server";

import { redirect } from "next/navigation";
import { signUp, signIn, signOut, getGoogleOAuthUrl } from "@/lib/appwrite/account";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn(email, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }

  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signUp(email, password, name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signup failed";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }

  redirect("/login?message=" + encodeURIComponent("Tài khoản đã được tạo! Đăng nhập để tiếp tục."));
}

/** Returns Google OAuth URL — called client-side to set window.location.href */
export async function getGoogleOAuthUrlAction(): Promise<{ url: string }> {
  const url = await getGoogleOAuthUrl();
  return { url };
}

export async function signoutAction() {
  try {
    await signOut();
  } catch {
    // Continue regardless
  }
  redirect("/login");
}
```

- [ ] **Step 2: Viết login page**

```tsx
// frontend/src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, signupAction, getGoogleOAuthUrl } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  async function handleSubmit(formData: FormData) {
    if (isSignUp) {
      await signupAction(formData);
    } else {
      await loginAction(formData);
    }
  }

  async function handleGoogle() {
    // Must be client-side — createOAuth2Token() returns URL, we set window.location
    const { getGoogleOAuthUrlAction } = await import("./actions");
    const { url } = await getGoogleOAuthUrlAction();
    window.location.href = url;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-500">🐤 VietFi Advisor</h1>
          <p className="text-gray-600 mt-2">Cố vấn Tài chính AI Cho Người Việt</p>
        </div>

        <div className="card bg-white shadow-xl rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isSignUp ? "Tạo Tài Khoản" : "Đăng Nhập"}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="label">Họ tên</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="input-text w-full"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                required
                className="input-text w-full"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="input-text w-full"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              {isSignUp ? "Tạo Tài Khoản" : "Đăng Nhập"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">hoặc</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Đăng nhập với Google
          </button>

          <p className="text-center mt-6 text-sm text-gray-600">
            {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-600 hover:underline font-medium"
            >
              {isSignUp ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Viết OAuth callback page**

```tsx
// frontend/src/app/auth/callback/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Appwrite OAuth redirects here with ?key=...&userId=...&expire=...
    // The Appwrite SDK auto-creates a session from these URL params on the client.
    // We just need to verify the session was created by checking account.get().
    import("@/lib/appwrite/account")
      .then(({ getCurrentUser }) => getCurrentUser())
      .then((user) => {
        if (user) {
          router.replace("/dashboard");
        } else {
          setError("oauth_failed");
          router.replace("/login?error=oauth_failed");
        }
      })
      .catch(() => {
        router.replace("/login?error=oauth_failed");
      });
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Đăng nhập thất bại. <a href="/login" className="underline">Thử lại</a>.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 animate-pulse">Đang đăng nhập...</p>
    </div>
  );
}
```

- [ ] **Step 4: Viết signout route**

```typescript
// frontend/src/app/auth/signout/route.ts
import { signoutAction } from "@/app/login/actions";

export async function POST() {
  await signoutAction();
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/login/ frontend/src/app/auth/
git commit -m "feat(appwrite): add login, signup, Google OAuth pages"
```

---

## Chunk 6: Middleware — Auth Guard

### Task 9: Viết Next.js Middleware

**Files:**
- Create: `frontend/src/middleware.ts`

- [ ] **Step 1: Viết middleware (server-side session check)**

> ⚠️ **Important:** Next.js middleware runs on the server — it has no browser context. `getCurrentUser()` from `client.ts` works client-side but NOT here. Instead, use the Appwrite session cookie that the SDK sets when a user logs in.

```typescript
// frontend/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Client, Account } from "appwrite";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get session cookie set by Appwrite SDK
  // The cookie name format: "a_session_<projectId>"
  const sessionCookie = request.cookies.get("a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}");

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify session is valid server-side
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setSession(sessionCookie.value);

    const account = new Account(client);
    await account.get(); // throws if session expired
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/middleware.ts
git commit -m "feat(appwrite): add auth middleware guard"
```

---

## Chunk 7: Appwrite Function — chat-vetvang

### Task 10: Viết Appwrite Function

**Files:**
- Create: `functions/chat-vetvang/package.json`
- Create: `functions/chat-vetvang/index.ts`
- Create: `functions/chat-vetvang/tsconfig.json`

- [ ] **Step 1: Tạo function structure**

```bash
mkdir -p functions/chat-vetvang
```

```json
// functions/chat-vetvang/package.json
{
  "name": "chat-vetvang",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "node-appwrite": "^13.0.0",
    "@google/generative-ai": "^0.21.0"
  }
}
```

```json
// functions/chat-vetvang/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

```typescript
// functions/chat-vetvang/index.ts
import { Runtime, Sockets, Query, ID } from "node-appwrite";
import { GoogleGenerativeAI } from "@google/generative-ai";

// System prompt for Vẹt Vàng
const SYSTEM_PROMPT = `Bạn là Vẹt Vàng (Golden Parrot) - một mascot AI tài chính cá nhân cho người Việt. Bạn hài hước, châm biếm, và thẳng thắn. Không bao giờ lịch sự một cách generic. Luôn dùng tiếng Việt. Chủ đề: tài chính, đầu tư, tiết kiệm, chi tiêu.`;

interface Message {
  role: "user" | "model";
  content: string;
}

export default async ({ req, res, log, error }: any) => {
  try {
    const body = req.bodyJson();
    const { message, history = [] } = body as {
      message: string;
      history: Message[];
    };

    if (!message) {
      return res.json({ error: "message is required" }, 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const baseUrl = process.env.GEMINI_BASE_URL;

    if (!apiKey) {
      return res.json({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      ...(baseUrl ? { apiEndpoint: baseUrl } : {}),
    });

    // Build conversation history
    const chatHistory: Parameters<typeof model.generateContent>[0]["history"] =
      history.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return res.json({ reply: text });
  } catch (err) {
    error(`chat-vetvang error: ${err}`);
    return res.json({ error: "Internal server error" }, 500);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add functions/
git commit -m "feat(function): add chat-vetvang Appwrite Function"
```

---

## Chunk 8: Railway Proxy — Market Data API Routes

### Task 11: Update API routes để proxy sang Railway

**Files:**
- Modify: `frontend/src/app/api/market-data/route.ts`
- Modify: `frontend/src/app/api/news/route.ts`

- [ ] **Step 1: Update market-data route**

```typescript
// frontend/src/app/api/market-data/route.ts
import { NextResponse } from "next/server";

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL!;

export async function GET() {
  try {
    const res = await fetch(`${RAILWAY_URL}/market-data`, {
      next: { revalidate: 300 }, // cache 5 phút
    });
    if (!res.ok) throw new Error(`Railway responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[market-data] Railway fetch failed:", err);
    return NextResponse.json({ error: "Market data unavailable" }, 500);
  }
}
```

- [ ] **Step 2: Update news route**

```typescript
// frontend/src/app/api/news/route.ts
import { NextResponse } from "next/server";

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL!;

export async function GET() {
  try {
    const res = await fetch(`${RAILWAY_URL}/news`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`Railway responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[news] Railway fetch failed:", err);
    return NextResponse.json({ error: "News unavailable" }, 500);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/market-data/route.ts frontend/src/app/api/news/route.ts
git commit -m "feat: proxy market/news API routes to Railway"
```

---

## Chunk 9: Cleanup — Remove Supabase Imports + Test Smoketest

### Task 12: Dọn Supabase + Test

**Files:**
- Check: `frontend/src/` — no `@supabase/` imports anywhere

- [ ] **Step 1: Verify no Supabase imports remain**

```bash
cd frontend
rg "@supabase" src/ --files-with-matches
# Expected: empty output

# Also check package.json
rg "supabase" package.json
# Expected: only appwrite
```

- [ ] **Step 2: Build test**

```bash
cd frontend
npm run build 2>&1 | head -50
# Expected: build completes (allow warnings)
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — no supabase imports remain"
```

---

## Chunk 10: Appwrite Sites + GitHub Actions Deployment

### Task 13: Deploy lên Appwrite Sites

**Manual steps (require Appwrite Cloud access):**

- [ ] **Step 1: Setup 5 collections trên Appwrite Console**

1. Go to https://cloud.appwrite.io → your project
2. Navigate to **Databases** → **Create Database** → ID: `vietfi_db`
3. Create collections: `profiles`, `budget_pots`, `expenses`, `debts`, `gamification`
4. Add attributes per `docs/appwrite-schema.md`
5. Set permissions: **Any authenticated user** can read/write

- [ ] **Step 2: Enable Auth providers**

1. Go to **Auth** → **Settings**
2. Enable **Email/Password**
3. Enable **Google OAuth** → add Client ID + Secret from Google Cloud Console

- [ ] **Step 3: Connect GitHub repo to Appwrite Sites**

1. Go to **Sites** → **Create Site**
2. Select **Connect repository** → choose `vietfi-appwrite`
3. Root directory: `frontend`
4. Framework: **Next.js** (auto-detect)
5. Build settings:
   - Install: `npm install`
   - Build: `npm run build`
   - Output: `./.next`
6. Environment variables: add from `.env.example`
7. Deploy

- [ ] **Step 4: Setup GitHub Actions for Functions**

```bash
mkdir -p .github/workflows
cat > .github/workflows/appwrite-functions.yml << 'EOF'
name: Deploy Appwrite Functions

on:
  push:
    branches: [main]
    paths: ["functions/**"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Install Appwrite CLI
        run: npm install -g appwrite
      - name: Setup Appwrite
        uses: appwrite/setup-for-appwrite@v2
        with:
          method: key
          key: ${{ secrets.APPWRITE_API_KEY }}
          project: ${{ secrets.APPWRITE_PROJECT_ID }}
      - name: Deploy functions
        run: |
          appwrite push functions --force
        working-directory: functions
env:
  APPWRITE_API_KEY: ${{ secrets.APPWRITE_API_KEY }}
  APPWRITE_PROJECT_ID: ${{ secrets.APPWRITE_PROJECT_ID }}
EOF
```

- [ ] **Step 5: Add GitHub Secrets**

In GitHub repo → Settings → Secrets:
- `APPWRITE_API_KEY` — from Appwrite Console → Keys
- `APPWRITE_PROJECT_ID` — your project ID

- [ ] **Step 6: Commit deployment config**

```bash
git add .github/
git commit -m "ci: add GitHub Actions for Appwrite Functions deploy"
git push
```

---

## Chunk 11: Chat API Route + Appwrite Config + Gamification Engine

### Task 14: Viết `POST /api/chat` route

**Files:**
- Create: `frontend/src/app/api/chat/route.ts`

- [ ] **Step 1: Viết chat API route**

Proxy requests from VetVangChat component to the deployed Appwrite Function.

```typescript
// frontend/src/app/api/chat/route.ts
import { NextResponse } from "next/server";

const APPWRITE_FUNCTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID!;
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

export async function POST(req: Request) {
  const body = await req.json();
  const { message, history } = body;

  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${APPWRITE_ENDPOINT}/functions/${APPWRITE_FUNCTION_ID}/executions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        },
        body: JSON.stringify({ message, history: history ?? [] }),
      }
    );

    if (!res.ok) throw new Error(`Appwrite responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[chat] Appwrite function error:", err);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 });
  }
}
```

Also add to `frontend/.env.example`:
```
NEXT_PUBLIC_APPWRITE_FUNCTION_ID=<your_function_id>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/api/chat/route.ts
git commit -m "feat: add chat API route proxying to Appwrite Function"
```

### Task 15: Viết `appwrite.config.json`

**Files:**
- Create: `frontend/appwrite.config.json`

- [ ] **Step 1: Tạo appwrite.config.json**

```json
// frontend/appwrite.config.json
{
  "projectId": "<your_project_id>",
  "platform": {
    "name": "web",
    "hostname": "<your-domain>"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/appwrite.config.json
git commit -m "chore: add Appwrite Sites config"
```

### Task 16: Migrate `src/lib/gamification.ts` engine

**Files:**
- Create: `frontend/src/lib/gamification.ts` (Appwrite version)

Copy from `vietfi-advisor/src/lib/gamification.ts`, then swap these imports:

```
FROM: import { saveGamificationState, getGamificationState } from "@/lib/supabase/user-data";
TO:   import { saveGamificationState, getGamificationState } from "@/lib/appwrite-user-data";
```

All XP logic, streak calculation, level progression, and daily quests stay identical.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/gamification.ts
git commit -m "feat(appwrite): migrate gamification engine to use Appwrite DAL"
```

### Task 17: Migrate dashboard pages

**Files:**
- Create: `frontend/src/app/dashboard/` (all pages)

For each dashboard page, copy from `vietfi-advisor/src/app/dashboard/` and swap imports:

```
FROM: from "@/lib/supabase/user-data"   → TO: from "@/lib/appwrite-user-data"
FROM: from "@/lib/supabase/useUserData"  → TO: from "@/lib/appwrite-useUserData"
FROM: from "@/lib/supabase/migrate-local" → REMOVE (no migration needed)
```

Pages to migrate:
- `dashboard/page.tsx` — overview
- `dashboard/budget/page.tsx`
- `dashboard/debt/page.tsx`
- `dashboard/portfolio/page.tsx`
- `dashboard/risk-profile/page.tsx`
- `dashboard/market/page.tsx`
- `dashboard/news/page.tsx`
- `dashboard/learn/page.tsx`

```bash
cp -r ../vietfi-advisor/src/app/dashboard frontend/src/app/
# Then batch-replace imports in all copied files:
rg "from \"@/lib/supabase" frontend/src/app/dashboard/ --files-with-matches
# Edit each file to update imports
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/
git commit -m "feat(appwrite): migrate all dashboard pages to Appwrite"
```

---

## Summary

| Chunk | Tasks | Status |
|---|---|---|
| 1 | Repo setup + SDK install | `plan` |
| 2 | Appwrite Console setup + schema (manual) | `manual` |
| 3 | SDK client + account + database helpers | `plan` |
| 4 | Data Access Layer (DAL) | `plan` |
| 5 | React hooks | `plan` |
| 6 | Auth pages (login, OAuth, signout) | `plan` |
| 7 | Middleware auth guard | `plan` |
| 8 | Appwrite Function chat-vetvang | `plan` |
| 9 | Railway proxy API routes (market, news) | `plan` |
| 10 | Cleanup + test | `plan` |
| 11 | Chat API route + appwrite.config.json + gamification engine + dashboard pages | `plan` |
| 12 | Appwrite Sites deployment + GitHub Actions | `manual` |

**Total:** ~15 coding tasks + 2 manual steps.
