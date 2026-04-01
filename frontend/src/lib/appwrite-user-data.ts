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
