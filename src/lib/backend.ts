// EXPORTS: useBackend, BackendProvider, useHasBackend
// 后端可用性检测 + 用户数据同步 hook
// 设计原则：后端可用时优先走后端，不可用时自动降级到 localStorage
// 对上层组件透明，替换 scopedStorage 的持久化方案
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  createElement,
  type ReactNode,
} from 'react';
import { logger, scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { api } from './api';
import type { DietParams, DietMode, FoodEntry } from './macros';

const BACKEND_CHECK_KEY = 'shark_diet_backend_available';
const MIGRATED_KEY = 'shark_diet_migrated';

interface BackendContextValue {
  /** 后端是否可用（已通过联通性检测） */
  available: boolean;
  /** 是否正在检测后端 */
  checking: boolean;
  /** 是否已将 localStorage 数据迁移到后端 */
  migrated: boolean;
  /** 强制重新检测后端可用性 */
  recheck: () => Promise<void>;
  /** 将本地数据迁移到后端 */
  migrateLocal: (payload: {
    params: DietParams;
    mode: DietMode;
    entries: FoodEntry[];
    customFoods: Array<Record<string, unknown>>;
    date: string;
  }) => Promise<boolean>;
}

const BackendContext = createContext<BackendContextValue | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState<boolean>(() => {
    try {
      return scopedStorage.getItem(BACKEND_CHECK_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [checking, setChecking] = useState(true);
  const [migrated, setMigrated] = useState<boolean>(() => {
    try {
      return scopedStorage.getItem(MIGRATED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const checkedRef = useRef(false);

  const checkBackend = useCallback(async () => {
    try {
      // 用一个轻量接口检测（用户参数）
      const result = await api.get<{ params: unknown }>('/user/params');
      if (result && typeof result === 'object') {
        setAvailable(true);
        scopedStorage.setItem(BACKEND_CHECK_KEY, '1');
        return true;
      }
      throw new Error('invalid response');
    } catch (err) {
      logger.info('[Backend] 后端不可用，降级到本地存储:', String(err));
      setAvailable(false);
      scopedStorage.setItem(BACKEND_CHECK_KEY, '0');
      return false;
    }
  }, []);

  const recheck = useCallback(async () => {
    setChecking(true);
    await checkBackend();
    setChecking(false);
  }, [checkBackend]);

  const migrateLocal = useCallback(
    async (payload: {
      params: DietParams;
      mode: DietMode;
      entries: FoodEntry[];
      customFoods: Array<Record<string, unknown>>;
      date: string;
    }) => {
      if (!available) return false;
      try {
        await api.post('/migrate/local', {
          params: payload.params,
          mode: payload.mode,
          entries: payload.entries.map((e) => ({
            id: e.id,
            foodId: e.foodId,
            foodName: '食物', // 前端没有食物名，先占位
            foodSource: 'builtin',
            grams: e.grams,
            carbs: 0,
            protein: 0,
            fat: 0,
          })),
          customFoods: payload.customFoods,
          date: payload.date,
        });
        setMigrated(true);
        scopedStorage.setItem(MIGRATED_KEY, '1');
        logger.info('[Backend] 本地数据迁移完成');
        return true;
      } catch (err) {
        logger.error('[Backend] 迁移失败:', String(err));
        return false;
      }
    },
    [available],
  );

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkBackend().finally(() => setChecking(false));
  }, [checkBackend]);

  return createElement(
    BackendContext.Provider,
    { value: { available, checking, migrated, recheck, migrateLocal } },
    children,
  );
}

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    // 兜底：无 provider 时返回本地模式
    return {
      available: false,
      checking: false,
      migrated: false,
      recheck: async () => {},
      migrateLocal: async () => false,
    };
  }
  return ctx;
}

export function useHasBackend(): boolean {
  return useBackend().available;
}
