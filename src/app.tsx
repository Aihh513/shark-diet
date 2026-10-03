import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import HomePage from "@/pages/HomePage/HomePage";
import CustomPlanPage from "@/pages/CustomPlanPage/CustomPlanPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import { BackendProvider } from "@/lib/backend";
import PremiumGate from "@/components/PremiumGate";
import { useMembership } from "@/lib/membership";
import { useEffect, useState } from "react";
import { scopedStorage } from "@lark-apaas/client-toolkit-lite";
import type { DietParams, DietMode, FoodEntry } from "@/lib/macros";

// 从本地存储读取参数（与首页共享）
const STORAGE_PARAMS = 'shark_diet_params';
const STORAGE_MODE = 'shark_diet_mode';

const DEFAULT_PARAMS: DietParams = {
  height: 175,
  weight: 70,
  age: 25,
  gender: 'male',
  activityFactor: 1.375,
  goal: 'cut',
  deficit: 500,
  surplus: 300,
};

function loadParams(): DietParams {
  try {
    const raw = scopedStorage.getItem(STORAGE_PARAMS);
    if (raw) return JSON.parse(raw) as DietParams;
  } catch { /* ignore */ }
  return DEFAULT_PARAMS;
}

function loadMode(): DietMode {
  try {
    const raw = scopedStorage.getItem(STORAGE_MODE);
    if (raw) return JSON.parse(raw) as DietMode;
  } catch { /* ignore */ }
  return 'training';
}

function CustomPlanRoute() {
  const { isPremium, loading, activatePremium } = useMembership();
  const [params, setParams] = useState<DietParams>(() => loadParams());
  const [mode, setMode] = useState<DietMode>(() => loadMode());

  // 监听存储变化（首页修改后同步）
  useEffect(() => {
    const handler = () => {
      setParams(loadParams());
      setMode(loadMode());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <PremiumGate isPremium={isPremium} loading={loading} onActivate={activatePremium}>
      <CustomPlanPage params={params} mode={mode} isPremium={isPremium} />
    </PremiumGate>
  );
}

export default function App() {
  return (
    <BackendProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="custom-plan" element={<CustomPlanRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-center" />
    </BackendProvider>
  );
}
