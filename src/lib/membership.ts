// EXPORTS: useMembership, useCustomPlans, PAYMENT_PROVIDER_CONFIG
import { useState, useEffect, useCallback, useRef } from 'react';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import { api } from '@/lib/api';
import type { CustomPlan, PlanPreferences } from '@/data/custom-plan';
import { DEFAULT_PREFERENCES } from '@/data/custom-plan';
import { calcBMR, calcTDEE, calcTargetCalories, type DietParams } from '@/lib/macros';

const MEMBERSHIP_KEY = 'shark_diet_membership';
const PLANS_KEY = 'shark_diet_custom_plans';

/**
 * 会员状态管理
 * 后端 plan 字段控制；前端优先读后端，无后端时降级到 localStorage 模拟
 */
export function useMembership() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        // 先尝试读后端 /user/profile 的 plan 字段
        const result = await (api as unknown as { get: (p: string) => Promise<{ plan?: string; isPremium?: boolean }> }).get('/user/profile');
        if (!cancelled && result && typeof result === 'object') {
          const premium = result.plan === 'premium' || result.isPremium === true;
          setIsPremium(premium);
          scopedStorage.setItem(MEMBERSHIP_KEY, premium ? '1' : '0');
        }
      } catch (err) {
        // 后端不可用，读本地
        logger.info('[Membership] 后端不可用，降级本地存储:', String(err));
        const local = scopedStorage.getItem(MEMBERSHIP_KEY) === '1';
        if (!cancelled) setIsPremium(local);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  /**
   * 模拟解锁流程（演示用）
   * 真实支付网关接入点：PAYMENT_PROVIDER_CONFIG
   */
  const activatePremium = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: 接入真实支付（微信/支付宝），见 PAYMENT_PROVIDER_CONFIG
      // 模拟流程：直接写本地 + 尝试写后端
      scopedStorage.setItem(MEMBERSHIP_KEY, '1');
      setIsPremium(true);
      // 尝试同步后端
      try {
        await (api as unknown as { post: (p: string, body: unknown) => Promise<unknown> }).post('/user/plan', { plan: 'premium' });
      } catch {
        // 后端失败忽略，本地已生效
      }
      return true;
    } catch (err) {
      logger.error('[Membership] 激活失败:', String(err));
      return false;
    }
  }, []);

  return { isPremium, loading, activatePremium };
}

/**
 * 定制计划管理
 * 计划列表存后端，无后端时降级到 localStorage
 */
export function useCustomPlans() {
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [loading, setLoading] = useState(true);
  // 保存最新 plans 的 ref，用于异步场景下读取最新值（避免闭包陈旧）
  const plansRef = useRef<CustomPlan[]>([]);
  useEffect(() => { plansRef.current = plans; }, [plans]);

  // 将 plans 写入存储 + 同步后端（工具函数，基于最新 plansRef）
  const persistPlans = useCallback((newPlans: CustomPlan[]) => {
    plansRef.current = newPlans;
    scopedStorage.setItem(PLANS_KEY, JSON.stringify(newPlans));
    (async () => {
      try {
        await (api as unknown as { post: (p: string, body: unknown) => Promise<unknown> }).post('/custom-plans/sync', { plans: newPlans });
      } catch {
        // 静默失败
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await (api as unknown as { get: (p: string) => Promise<{ plans?: CustomPlan[] }> }).get('/custom-plans');
        if (!cancelled && result && Array.isArray(result.plans)) {
          setPlans(result.plans);
          scopedStorage.setItem(PLANS_KEY, JSON.stringify(result.plans));
        } else {
          throw new Error('invalid');
        }
      } catch {
        const raw = scopedStorage.getItem(PLANS_KEY);
        if (!cancelled && raw) {
          try { setPlans(JSON.parse(raw) as CustomPlan[]); } catch { /* ignore */ }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const addPlan = useCallback((plan: CustomPlan) => {
    setPlans(prev => {
      const next = [plan, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
      persistPlans(next);
      return next;
    });
  }, [persistPlans]);

  const updatePlan = useCallback((id: string, patch: Partial<CustomPlan>) => {
    setPlans(prev => {
      const next = prev
        .map(p => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      persistPlans(next);
      return next;
    });
  }, [persistPlans]);

  const deletePlan = useCallback((id: string) => {
    setPlans(prev => {
      const next = prev.filter(p => p.id !== id);
      persistPlans(next);
      return next;
    });
  }, [persistPlans]);

  const getPlan = useCallback((id: string) => plansRef.current.find(p => p.id === id), []);

  /**
   * 向计划追加一次调整版本（基于 plansRef 最新值，避免闭包陈旧导致 adjustments 错乱）
   */
  const addAdjustment = useCallback((
    planId: string,
    adjustment: { id: string; timestamp: number; userFeedback: string; adjustedContent: string },
  ) => {
    setPlans(prev => {
      const next = prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          currentContent: adjustment.adjustedContent,
          adjustments: [...p.adjustments, adjustment],
          updatedAt: Date.now(),
        };
      }).sort((a, b) => b.updatedAt - a.updatedAt);
      persistPlans(next);
      return next;
    });
  }, [persistPlans]);

  return { plans, loading, addPlan, updatePlan, deletePlan, getPlan, addAdjustment };
}

/** 生成新计划的初始草稿 */
export function createPlanDraft(params: DietParams, preferences: PlanPreferences = DEFAULT_PREFERENCES): CustomPlan {
  const bmr = calcBMR(params);
  const tdee = calcTDEE(params);
  const targetCalories = calcTargetCalories(params);
  const now = Date.now();
  return {
    id: `plan_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    createdAt: now,
    updatedAt: now,
    paramsSnapshot: {
      height: params.height,
      weight: params.weight,
      age: params.age,
      gender: params.gender,
      activityFactor: params.activityFactor,
      goal: params.goal,
      deficit: params.deficit,
      surplus: params.surplus,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
    },
    preferences,
    content: '',
    adjustments: [],
    currentContent: '',
    status: 'generating',
  };
}

/**
 * 支付配置（预留扩展点）
 * 接入真实支付时，填充各 provider 的 appId / 回调地址等
 */
export const PAYMENT_PROVIDER_CONFIG = {
  wechat: {
    enabled: false,
    appId: '',
    mchId: '',
    callbackUrl: '',
  },
  alipay: {
    enabled: false,
    appId: '',
    callbackUrl: '',
  },
  // 套餐价格（分）
  plans: {
    monthly: { price: 2900, label: '月度会员', period: '1个月' },
    quarterly: { price: 7900, label: '季度会员', period: '3个月' },
    yearly: { price: 19900, label: '年度会员', period: '12个月' },
  },
};
