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
