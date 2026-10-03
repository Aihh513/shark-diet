// EXPORTS: useNutritionSearch
import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit-lite';
import { api } from './api';

export interface NutritionSearchResult {
  id: string;
  name: string;
  source: 'usda' | 'openfoodfacts';
  carbs: number;
  protein: number;
  fat: number;
  calories?: number;
  category?: string;
  brand?: string;
  barcode?: string;
}

interface SearchState {
  results: NutritionSearchResult[];
  loading: boolean;
  error: string | null;
  sources: { usda: number; openfoodfacts: number };
}

/**
 * 权威营养数据库搜索 hook
 * 前端调用后端 API（后端代理 USDA + Open Food Facts）
 */
export function useNutritionSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    sources: { usda: 0, openfoodfacts: 0 },
  });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    // 清掉上次的 debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!query.trim()) {
      setState({ results: [], loading: false, error: null, sources: { usda: 0, openfoodfacts: 0 } });
      return;
    }

    // 取消上次请求
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    // debounce 300ms
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await api.get<{
          query: string;
          total: number;
          sources: { usda: number; openfoodfacts: number };
          results: NutritionSearchResult[];
        }>(`/nutrition/search?q=${encodeURIComponent(query)}&limit=10`);
        setState({
          results: res.results ?? [],
          loading: false,
          error: null,
          sources: res.sources ?? { usda: 0, openfoodfacts: 0 },
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        logger.error('[NutritionSearch] 搜索失败:', String(err));
        setState({
          results: [],
          loading: false,
          error: (err as Error).message || '搜索失败',
          sources: { usda: 0, openfoodfacts: 0 },
        });
      }
    }, 300);
  }, []);

  const searchByBarcode = useCallback(async (code: string): Promise<NutritionSearchResult | null> => {
    try {
      const res = await api.get<{ found: boolean; result: NutritionSearchResult | null }>(
        `/nutrition/barcode?code=${encodeURIComponent(code)}`,
      );
      return res.found && res.result ? res.result : null;
    } catch (err) {
      logger.error('[NutritionSearch] 条码查询失败:', String(err));
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    results: state.results,
    loading: state.loading,
    error: state.error,
    sources: state.sources,
    search,
    searchByBarcode,
  };
}
