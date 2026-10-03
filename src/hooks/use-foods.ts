import { useCallback, useEffect, useState } from 'react';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import type { IFood } from '@/data/foods';
import { MOCK_FOODS as BUILT_IN_FOODS } from '@/data/foods';

const STORAGE_KEY = 'shark_diet_custom_foods';
const STORAGE_OVERRIDES = 'shark_diet_food_overrides';

export interface CustomFood extends IFood {
  note?: string;
}

export interface FoodOverrides {
  [foodId: string]: { carbs: number; protein: number; fat: number; name?: string };
}

function loadCustomFoods(): CustomFood[] {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomFood[];
  } catch {
    return [];
  }
}

function loadOverrides(): FoodOverrides {
  try {
    const raw = scopedStorage.getItem(STORAGE_OVERRIDES);
    if (!raw) return {};
    return JSON.parse(raw) as FoodOverrides;
  } catch {
    return {};
  }
}

/**
 * 合并内置食物 + 自定义食物 + 内置食物的本地覆盖
 */
function mergeFoods(custom: CustomFood[], overrides: FoodOverrides): IFood[] {
  const built = BUILT_IN_FOODS.map((f) => {
    const ov = overrides[f.id];
    if (!ov) return f;
    return {
      ...f,
      carbs: ov.carbs,
      protein: ov.protein,
      fat: ov.fat,
      name: ov.name ?? f.name,
    };
  });
  return [...custom, ...built];
}

export function useFoods() {
  const [customFoods, setCustomFoods] = useState<CustomFood[]>(() => loadCustomFoods());
  const [overrides, setOverrides] = useState<FoodOverrides>(() => loadOverrides());
  const [allFoods, setAllFoods] = useState<IFood[]>(() =>
    mergeFoods(loadCustomFoods(), loadOverrides()),
  );

  useEffect(() => {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(customFoods));
    setAllFoods(mergeFoods(customFoods, overrides));
  }, [customFoods, overrides]);

  useEffect(() => {
    scopedStorage.setItem(STORAGE_OVERRIDES, JSON.stringify(overrides));
    setAllFoods(mergeFoods(customFoods, overrides));
  }, [overrides]);

  const addCustomFood = useCallback((food: Omit<CustomFood, 'id' | 'category'>) => {
    const newFood: CustomFood = {
      ...food,
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: 'custom',
    };
    setCustomFoods((prev) => [newFood, ...prev]);
    return newFood;
  }, []);

  const updateCustomFood = useCallback((id: string, patch: Partial<CustomFood>) => {
    setCustomFoods((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeCustomFood = useCallback((id: string) => {
    try {
      setCustomFoods((prev) => prev.filter((f) => f.id !== id));
      // 同步写一次 localStorage，避免依赖 useEffect 延迟
      scopedStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(customFoods.filter((f) => f.id !== id)),
      );
      return true;
    } catch (err) {
      // 兜底：强制从 state 中移除，下次刷新从 localStorage 重新加载
      setCustomFoods((prev) => prev.filter((f) => f.id !== id));
      logger.error('[useFoods] removeCustomFood error:', String(err));
      return false;
    }
  }, [customFoods]);

  const overrideBuiltIn = useCallback(
    (foodId: string, data: { carbs: number; protein: number; fat: number; name?: string }) => {
      setOverrides((prev) => ({ ...prev, [foodId]: data }));
    },
    [],
  );

  const resetOverride = useCallback((foodId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[foodId];
      return next;
    });
  }, []);

  const isOverridden = useCallback(
    (foodId: string) => Object.prototype.hasOwnProperty.call(overrides, foodId),
    [overrides],
  );

  return {
    allFoods,
    customFoods,
    overrides,
    addCustomFood,
    updateCustomFood,
    removeCustomFood,
    overrideBuiltIn,
    resetOverride,
    isOverridden,
  };
}

export type UseFoodsReturn = ReturnType<typeof useFoods>;
